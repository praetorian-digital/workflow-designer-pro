<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Place;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Transition;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Yaml\Yaml;
use Symfony\Component\HttpKernel\KernelInterface;
use Symfony\Contracts\Cache\CacheInterface;

/**
 * Service for publishing workflows to Pimcore configuration.
 */
class WorkflowPublishService
{
    private Filesystem $filesystem;
    private string $publishPath;
    private bool $backupEnabled;
    private bool $autoCacheClear;
    private KernelInterface $kernel;
    private ?CacheInterface $cache;

    public function __construct(
        string $publishPath,
        bool $backupEnabled,
        bool $autoCacheClear,
        KernelInterface $kernel,
        ?CacheInterface $cache = null
    ) {
        $this->filesystem = new Filesystem();
        $this->publishPath = $publishPath;
        $this->backupEnabled = $backupEnabled;
        $this->autoCacheClear = $autoCacheClear;
        $this->kernel = $kernel;
        $this->cache = $cache;
        
        $this->ensurePublishDirectory();
    }

    private function ensurePublishDirectory(): void
    {
        if (!$this->filesystem->exists($this->publishPath)) {
            $this->filesystem->mkdir($this->publishPath, 0755);
        }
    }

    /**
     * Publish a workflow to the Pimcore configuration.
     */
    public function publish(Workflow $workflow, WorkflowStorageService $storageService): array
    {
        $result = [
            'success' => false,
            'message' => '',
            'backupFile' => null,
            'publishedFile' => null,
            'version' => null,
        ];

        // Create version before publishing
        $version = $storageService->createVersion($workflow);
        $result['version'] = $version;

        // Generate YAML content
        $yamlContent = $this->generatePimcoreWorkflowYaml($workflow);

        // Create backup if enabled
        $targetFile = $this->publishPath . '/' . $workflow->getName() . '.yaml';
        if ($this->backupEnabled && file_exists($targetFile)) {
            $backupFile = $this->createBackup($targetFile, $workflow->getName());
            $result['backupFile'] = $backupFile;
        }

        // Write the workflow YAML
        try {
            $this->filesystem->dumpFile($targetFile, $yamlContent);
            $result['publishedFile'] = $targetFile;
            
            // Update workflow status
            $workflow->setStatus('published');
            $storageService->saveDraft($workflow);

            // Clear cache if enabled
            if ($this->autoCacheClear) {
                $this->clearCache();
            }

            $result['success'] = true;
            $result['message'] = sprintf('Workflow "%s" published successfully', $workflow->getName());
        } catch (\Exception $e) {
            $result['message'] = sprintf('Failed to publish workflow: %s', $e->getMessage());
        }

        return $result;
    }

    /**
     * Unpublish a workflow (remove from configuration).
     */
    public function unpublish(string $workflowName): array
    {
        $result = [
            'success' => false,
            'message' => '',
            'backupFile' => null,
        ];

        $targetFile = $this->publishPath . '/' . $workflowName . '.yaml';

        if (!file_exists($targetFile)) {
            $result['message'] = sprintf('Workflow "%s" is not published', $workflowName);
            return $result;
        }

        // Create backup before removing
        if ($this->backupEnabled) {
            $backupFile = $this->createBackup($targetFile, $workflowName);
            $result['backupFile'] = $backupFile;
        }

        try {
            $this->filesystem->remove($targetFile);
            
            if ($this->autoCacheClear) {
                $this->clearCache();
            }

            $result['success'] = true;
            $result['message'] = sprintf('Workflow "%s" unpublished successfully', $workflowName);
        } catch (\Exception $e) {
            $result['message'] = sprintf('Failed to unpublish workflow: %s', $e->getMessage());
        }

        return $result;
    }

    /**
     * Generate Pimcore workflow YAML configuration.
     */
    public function generatePimcoreWorkflowYaml(Workflow $workflow): string
    {
        $config = [
            'pimcore' => [
                'workflows' => [
                    $workflow->getName() => $this->buildWorkflowConfig($workflow),
                ],
            ],
        ];

        return Yaml::dump($config, 10, 2, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);
    }

    private function buildWorkflowConfig(Workflow $workflow): array
    {
        $config = [
            'label' => $workflow->getLabel() ?: $workflow->getName(),
            'priority' => 1,
            'type' => $workflow->getType(),
        ];

        // Build support configuration based on strategy type
        $this->buildSupportConfig($workflow, $config);

        // Initial marking
        if ($workflow->getInitialMarking()) {
            $config['initial_markings'] = [$workflow->getInitialMarking()];
        }

        // Marking store - Pimcore only supports specific types:
        // "multiple_state", "single_state", "state_table", "data_object_multiple_state", "data_object_splitted_state"
        // NOT 'method' like standard Symfony workflows
        $validTypes = ['multiple_state', 'single_state', 'state_table', 'data_object_multiple_state', 'data_object_splitted_state'];
        $markingStoreType = $workflow->getMarkingStoreType() ?? 'state_table';
        
        // Fallback to state_table if an invalid type is used
        if (!in_array($markingStoreType, $validTypes)) {
            $markingStoreType = 'state_table';
        }
        
        $config['marking_store'] = [
            'type' => $markingStoreType,
        ];
        
        // Add arguments if specified (for some marking store types)
        if (!empty($workflow->getMarkingStoreArguments())) {
            $config['marking_store']['arguments'] = $workflow->getMarkingStoreArguments();
        }

        // Audit trail
        if ($workflow->isAuditTrailEnabled()) {
            $config['audit_trail'] = [
                'enabled' => true,
            ];
        }

        // Places
        $config['places'] = $this->buildPlacesConfig($workflow);

        // Transitions
        $config['transitions'] = $this->buildTransitionsConfig($workflow);

        // Global actions
        if (!empty($workflow->getGlobalActions())) {
            $config['globalActions'] = $workflow->getGlobalActions();
        }

        return $config;
    }

    /**
     * Build support configuration based on the support strategy type.
     * 
     * - Simple: uses 'supports' key with array of class names
     * - Expression: uses 'support_strategy' with type: expression and arguments
     * - Custom: uses 'support_strategy' with service key
     */
    private function buildSupportConfig(Workflow $workflow, array &$config): void
    {
        $strategyType = $workflow->getSupportStrategyType();

        switch ($strategyType) {
            case Workflow::SUPPORT_STRATEGY_EXPRESSION:
                // Expression strategy: requires class and expression
                $supports = $workflow->getSupports();
                $expression = $workflow->getSupportStrategyExpression();
                
                if (!empty($supports) && !empty($expression)) {
                    $config['support_strategy'] = [
                        'type' => 'expression',
                        'arguments' => [
                            // First argument is the class (or first class if multiple)
                            is_array($supports) ? $supports[0] : $supports,
                            // Second argument is the expression
                            $expression,
                        ],
                    ];
                } else {
                    // Fallback to simple supports if expression is not configured properly
                    $config['supports'] = $workflow->getSupports();
                }
                break;

            case Workflow::SUPPORT_STRATEGY_CUSTOM:
                // Custom service strategy
                $service = $workflow->getSupportStrategyService();
                
                if (!empty($service)) {
                    $config['support_strategy'] = [
                        'service' => $service,
                    ];
                } else {
                    // Fallback to simple supports if service is not configured
                    $config['supports'] = $workflow->getSupports();
                }
                break;

            case Workflow::SUPPORT_STRATEGY_SIMPLE:
            default:
                // Simple strategy: just list the supported classes
                $config['supports'] = $workflow->getSupports();
                break;
        }
    }

    private function buildPlacesConfig(Workflow $workflow): array
    {
        $placesConfig = [];

        foreach ($workflow->getPlaces() as $place) {
            $placeConfig = [];

            if ($place->getLabel()) {
                $placeConfig['label'] = $place->getLabel();
            }
            if ($place->getTitle()) {
                $placeConfig['title'] = $place->getTitle();
            }
            if ($place->getColor()) {
                $placeConfig['color'] = $place->getColor();
            }
            if ($place->isColorInverted()) {
                $placeConfig['colorInverted'] = true;
            }
            if (!$place->isVisibleInHeader()) {
                $placeConfig['visibleInHeader'] = false;
            }
            if (!empty($place->getPermissions())) {
                $placeConfig['permissions'] = $place->getPermissions();
            }
            if (!empty($place->getMetadata())) {
                $placeConfig['metadata'] = $place->getMetadata();
            }

            // Use simple array notation if place has no config
            if (empty($placeConfig)) {
                $placesConfig[$place->getName()] = null;
            } else {
                $placesConfig[$place->getName()] = $placeConfig;
            }
        }

        return $placesConfig;
    }

    private function buildTransitionsConfig(Workflow $workflow): array
    {
        $transitionsConfig = [];

        foreach ($workflow->getTransitions() as $transition) {
            $transitionConfig = [
                'from' => $transition->getFrom(),
                'to' => $transition->getTo(),
            ];

            if ($transition->getLabel()) {
                $transitionConfig['options']['label'] = $transition->getLabel();
            }
            if ($transition->getIconClass()) {
                $transitionConfig['options']['iconClass'] = $transition->getIconClass();
            }
            if ($transition->getObjectLayout()) {
                $transitionConfig['options']['objectLayout'] = $transition->getObjectLayout();
            }

            // Guard - convert to Symfony expression string
            $guardExpression = $this->buildGuardExpression($transition->getGuard());
            if ($guardExpression) {
                $transitionConfig['guard'] = $guardExpression;
            }

            // Notes
            if (!empty($transition->getNotes())) {
                $transitionConfig['options']['notes'] = $transition->getNotes();
            }

            // Notification settings - ensure channelType is always an array and clean up empty/internal fields
            if (!empty($transition->getNotificationSettings())) {
                $notificationSettings = [];
                foreach ($transition->getNotificationSettings() as $setting) {
                    $cleanedSetting = [];
                    
                    // Ensure channelType is an array
                    if (isset($setting['channelType'])) {
                        $cleanedSetting['channelType'] = is_array($setting['channelType']) 
                            ? $setting['channelType'] 
                            : [$setting['channelType']];
                    }
                    
                    // Only include non-empty arrays
                    if (!empty($setting['notifyUsers'])) {
                        $cleanedSetting['notifyUsers'] = $setting['notifyUsers'];
                    }
                    if (!empty($setting['notifyRoles'])) {
                        $cleanedSetting['notifyRoles'] = $setting['notifyRoles'];
                    }
                    
                    // Include mail settings if present and not empty
                    if (!empty($setting['mailType'])) {
                        $cleanedSetting['mailType'] = $setting['mailType'];
                    }
                    if (!empty($setting['mailPath'])) {
                        $cleanedSetting['mailPath'] = $setting['mailPath'];
                    }
                    
                    // Skip internal fields like 'id'
                    // Only add if there's meaningful content
                    if (!empty($cleanedSetting)) {
                        $notificationSettings[] = $cleanedSetting;
                    }
                }
                
                if (!empty($notificationSettings)) {
                    $transitionConfig['options']['notificationSettings'] = $notificationSettings;
                }
            }

            // Change published state (Pimcore uses 'changePublishedState', not 'changePublicationState')
            if ($transition->getChangePublicationState()) {
                $transitionConfig['options']['changePublishedState'] = $transition->getChangePublicationState();
            }

            // Metadata
            if (!empty($transition->getMetadata())) {
                $transitionConfig['metadata'] = $transition->getMetadata();
            }

            $transitionsConfig[$transition->getName()] = $transitionConfig;
        }

        return $transitionsConfig;
    }

    /**
     * Build a Symfony expression string from guard configuration.
     * 
     * Accepts:
     * - A string (the expression itself - new format)
     * - An array with 'expression' key (legacy format)
     * - An array with 'roles' and/or 'permissions' (legacy format - converted to expression)
     * - null or empty
     * 
     * @param string|array|null $guard
     */
    private function buildGuardExpression(string|array|null $guard): ?string
    {
        if (empty($guard)) {
            return null;
        }

        // New format: guard is directly a string expression
        if (is_string($guard)) {
            return trim($guard) !== '' ? trim($guard) : null;
        }

        // Legacy format: array with expression key
        if (isset($guard['expression']) && !empty($guard['expression'])) {
            return $guard['expression'];
        }

        // Legacy format: array with roles/permissions - convert to expression
        $expressions = [];

        // Handle roles
        if (!empty($guard['roles'])) {
            $roleExpressions = array_map(
                fn($role) => sprintf("is_granted('%s')", $role),
                $guard['roles']
            );
            if (count($roleExpressions) > 1) {
                $expressions[] = '(' . implode(' or ', $roleExpressions) . ')';
            } else {
                $expressions[] = $roleExpressions[0];
            }
        }

        // Handle permissions (Pimcore object permissions)
        if (!empty($guard['permissions'])) {
            $permExpressions = array_map(
                fn($perm) => sprintf("subject.isAllowed('%s')", $perm),
                $guard['permissions']
            );
            if (count($permExpressions) > 1) {
                $expressions[] = '(' . implode(' and ', $permExpressions) . ')';
            } else {
                $expressions[] = $permExpressions[0];
            }
        }

        if (empty($expressions)) {
            return null;
        }

        // Combine with 'and' if we have both roles and permissions
        return implode(' and ', $expressions);
    }

    /**
     * Create a backup of the workflow file.
     */
    private function createBackup(string $sourceFile, string $workflowName): string
    {
        $backupDir = dirname($this->publishPath) . '/workflow_designer_pro/backups';
        
        if (!$this->filesystem->exists($backupDir)) {
            $this->filesystem->mkdir($backupDir, 0755);
        }

        $timestamp = date('Y-m-d_H-i-s');
        $backupFile = $backupDir . '/' . $workflowName . '_' . $timestamp . '.yaml';
        
        $this->filesystem->copy($sourceFile, $backupFile);
        
        return $backupFile;
    }

    /**
     * Clear Symfony cache.
     */
    private function clearCache(): void
    {
        try {
            $cacheDir = $this->kernel->getCacheDir();
            
            // Clear Symfony pools
            if ($this->cache) {
                // Cache pool clear if available
            }

            // Touch cache clear marker file
            $markerFile = $cacheDir . '/url_generating_routes.php.meta';
            if (file_exists($markerFile)) {
                touch($markerFile);
            }
        } catch (\Exception $e) {
            // Log but don't fail on cache clear issues
        }
    }

    /**
     * Get all published workflows.
     */
    public function listPublished(): array
    {
        $published = [];
        
        if (!is_dir($this->publishPath)) {
            return $published;
        }

        $files = glob($this->publishPath . '/*.yaml');
        foreach ($files as $file) {
            $name = basename($file, '.yaml');
            $content = file_get_contents($file);
            
            $published[] = [
                'name' => $name,
                'file' => $file,
                'modifiedAt' => date('c', filemtime($file)),
                'size' => filesize($file),
            ];
        }

        return $published;
    }

    /**
     * Check if a workflow is published.
     */
    public function isPublished(string $workflowName): bool
    {
        $targetFile = $this->publishPath . '/' . $workflowName . '.yaml';
        return file_exists($targetFile);
    }

    /**
     * Get the diff between draft and published version.
     */
    public function getDiff(Workflow $workflow): ?string
    {
        $publishedFile = $this->publishPath . '/' . $workflow->getName() . '.yaml';
        
        if (!file_exists($publishedFile)) {
            return null;
        }

        $publishedContent = file_get_contents($publishedFile);
        $draftContent = $this->generatePimcoreWorkflowYaml($workflow);

        if ($publishedContent === $draftContent) {
            return null;
        }

        // Simple line-by-line diff
        $publishedLines = explode("\n", $publishedContent);
        $draftLines = explode("\n", $draftContent);

        $diff = [];
        $maxLines = max(count($publishedLines), count($draftLines));

        for ($i = 0; $i < $maxLines; $i++) {
            $publishedLine = $publishedLines[$i] ?? '';
            $draftLine = $draftLines[$i] ?? '';

            if ($publishedLine !== $draftLine) {
                if (!empty($publishedLine)) {
                    $diff[] = '- ' . $publishedLine;
                }
                if (!empty($draftLine)) {
                    $diff[] = '+ ' . $draftLine;
                }
            } else {
                $diff[] = '  ' . $publishedLine;
            }
        }

        return implode("\n", $diff);
    }
}

