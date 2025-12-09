<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Place;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Transition;
use PraetorianDigital\WorkflowDesignerProBundle\Model\GlobalAction;
use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Yaml\Exception\ParseException;

/**
 * Service for importing and exporting workflow definitions.
 */
class WorkflowImportExportService
{
    /**
     * Export workflow to JSON format.
     */
    public function exportToJson(Workflow $workflow, bool $pretty = true): string
    {
        $flags = JSON_UNESCAPED_UNICODE;
        if ($pretty) {
            $flags |= JSON_PRETTY_PRINT;
        }
        
        return json_encode($workflow->jsonSerialize(), $flags);
    }

    /**
     * Export workflow to YAML format (Pimcore workflow config).
     */
    public function exportToYaml(Workflow $workflow): string
    {
        $config = $this->buildPimcoreConfig($workflow);
        return Yaml::dump($config, 10, 2, Yaml::DUMP_MULTI_LINE_LITERAL_BLOCK);
    }

    /**
     * Import workflow from JSON format.
     */
    public function importFromJson(string $json): Workflow
    {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new \InvalidArgumentException('Invalid JSON: ' . json_last_error_msg());
        }

        return Workflow::fromArray($data);
    }

    /**
     * Import workflow from Pimcore YAML configuration.
     */
    public function importFromYaml(string $yaml): Workflow
    {
        try {
            $config = Yaml::parse($yaml);
        } catch (ParseException $e) {
            throw new \InvalidArgumentException('Invalid YAML: ' . $e->getMessage());
        }

        return $this->parseYamlConfig($config);
    }

    /**
     * Import workflow from a file (auto-detect format).
     */
    public function importFromFile(string $filePath): Workflow
    {
        if (!file_exists($filePath)) {
            throw new \InvalidArgumentException(sprintf('File not found: %s', $filePath));
        }

        $content = file_get_contents($filePath);
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);

        return match (strtolower($extension)) {
            'json' => $this->importFromJson($content),
            'yaml', 'yml' => $this->importFromYaml($content),
            default => throw new \InvalidArgumentException(sprintf('Unsupported file format: %s', $extension)),
        };
    }

    /**
     * Parse Pimcore YAML configuration into a Workflow model.
     */
    private function parseYamlConfig(array $config): Workflow
    {
        // Handle both full config (with pimcore.workflows wrapper) and direct workflow config
        $workflowConfig = null;
        $workflowName = 'imported_workflow';

        if (isset($config['pimcore']['workflows'])) {
            $workflows = $config['pimcore']['workflows'];
            $workflowName = array_key_first($workflows);
            $workflowConfig = $workflows[$workflowName];
        } elseif (isset($config['workflows'])) {
            $workflows = $config['workflows'];
            $workflowName = array_key_first($workflows);
            $workflowConfig = $workflows[$workflowName];
        } else {
            // Assume direct workflow config
            $workflowConfig = $config;
        }

        if (!$workflowConfig) {
            throw new \InvalidArgumentException('No workflow configuration found');
        }

        $workflow = new Workflow($workflowName);
        
        // Basic properties
        if (isset($workflowConfig['type'])) {
            $workflow->setType($workflowConfig['type']);
        }
        if (isset($workflowConfig['supports'])) {
            $workflow->setSupports((array) $workflowConfig['supports']);
        }
        if (isset($workflowConfig['support_strategy'])) {
            $workflow->setSupportStrategy($workflowConfig['support_strategy']);
        }
        if (isset($workflowConfig['initial_markings'])) {
            $markings = (array) $workflowConfig['initial_markings'];
            $workflow->setInitialMarking($markings[0] ?? null);
        } elseif (isset($workflowConfig['initial_marking'])) {
            $workflow->setInitialMarking($workflowConfig['initial_marking']);
        }

        // Marking store
        if (isset($workflowConfig['marking_store'])) {
            $ms = $workflowConfig['marking_store'];
            $workflow->setMarkingStoreType($ms['type'] ?? 'state_table');
            if (isset($ms['property'])) {
                $workflow->setMarkingStoreProperty($ms['property']);
            }
            if (isset($ms['arguments'])) {
                $workflow->setMarkingStoreArguments($ms['arguments']);
            }
        }

        // Audit trail
        if (isset($workflowConfig['audit_trail']['enabled'])) {
            $workflow->setAuditTrailEnabled((bool) $workflowConfig['audit_trail']['enabled']);
        }

        // Parse places
        if (isset($workflowConfig['places'])) {
            $workflow->setPlaces($this->parsePlaces($workflowConfig['places']));
        }

        // Parse transitions
        if (isset($workflowConfig['transitions'])) {
            $workflow->setTransitions($this->parseTransitions($workflowConfig['transitions']));
        }

        // Parse global actions
        if (isset($workflowConfig['globalActions'])) {
            $workflow->setGlobalActions($workflowConfig['globalActions']);
        }

        return $workflow;
    }

    /**
     * Parse places from YAML config.
     *
     * @return array<string, Place>
     */
    private function parsePlaces(array $placesConfig): array
    {
        $places = [];

        foreach ($placesConfig as $name => $config) {
            // Handle both array format and simple list format
            if (is_int($name) && is_string($config)) {
                // Simple list: ['draft', 'published']
                $name = $config;
                $config = [];
            }

            $place = new Place($name);

            if (is_array($config)) {
                if (isset($config['label'])) {
                    $place->setLabel($config['label']);
                }
                if (isset($config['title'])) {
                    $place->setTitle($config['title']);
                }
                if (isset($config['color'])) {
                    $place->setColor($config['color']);
                }
                if (isset($config['colorInverted'])) {
                    $place->setColorInverted((array) $config['colorInverted']);
                }
                if (isset($config['visibleInHeader'])) {
                    $place->setVisibleInHeader((bool) $config['visibleInHeader']);
                }
                if (isset($config['permissions'])) {
                    $place->setPermissions((array) $config['permissions']);
                }
                if (isset($config['metadata'])) {
                    $place->setMetadata($config['metadata']);
                }
            }

            $places[$name] = $place;
        }

        return $places;
    }

    /**
     * Parse transitions from YAML config.
     *
     * @return array<string, Transition>
     */
    private function parseTransitions(array $transitionsConfig): array
    {
        $transitions = [];

        foreach ($transitionsConfig as $name => $config) {
            $transition = new Transition($name);

            if (isset($config['from'])) {
                $transition->setFrom((array) $config['from']);
            }
            if (isset($config['to'])) {
                $transition->setTo((array) $config['to']);
            }
            if (isset($config['guard'])) {
                $transition->setGuard($config['guard']);
            }
            if (isset($config['metadata'])) {
                $transition->setMetadata($config['metadata']);
            }

            // Options
            if (isset($config['options'])) {
                $options = $config['options'];
                if (isset($options['label'])) {
                    $transition->setLabel($options['label']);
                }
                if (isset($options['iconClass'])) {
                    $transition->setIconClass($options['iconClass']);
                }
                if (isset($options['objectLayout'])) {
                    $transition->setObjectLayout($options['objectLayout']);
                }
                if (isset($options['notes'])) {
                    $transition->setNotes($options['notes']);
                }
                if (isset($options['notificationSettings'])) {
                    $transition->setNotificationSettings($options['notificationSettings']);
                }
                // Handle both 'changePublishedState' (Pimcore) and 'changePublicationState' (internal)
                if (isset($options['changePublishedState'])) {
                    $transition->setChangePublicationState($options['changePublishedState']);
                } elseif (isset($options['changePublicationState'])) {
                    $transition->setChangePublicationState($options['changePublicationState']);
                }
            }

            $transitions[$name] = $transition;
        }

        return $transitions;
    }

    /**
     * Build Pimcore workflow YAML config from Workflow model.
     */
    private function buildPimcoreConfig(Workflow $workflow): array
    {
        $config = [
            'type' => $workflow->getType(),
            'supports' => $workflow->getSupports(),
        ];

        if ($workflow->getSupportStrategy()) {
            $config['support_strategy'] = $workflow->getSupportStrategy();
        }

        if ($workflow->getInitialMarking()) {
            $config['initial_markings'] = [$workflow->getInitialMarking()];
        }

        // Marking store
        $config['marking_store'] = [
            'type' => $workflow->getMarkingStoreType() ?? 'state_table',
        ];
        if ($workflow->getMarkingStoreProperty()) {
            $config['marking_store']['property'] = $workflow->getMarkingStoreProperty();
        }

        // Audit trail
        if ($workflow->isAuditTrailEnabled()) {
            $config['audit_trail'] = ['enabled' => true];
        }

        // Places
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

            $placesConfig[$place->getName()] = empty($placeConfig) ? null : $placeConfig;
        }
        $config['places'] = $placesConfig;

        // Transitions
        $transitionsConfig = [];
        foreach ($workflow->getTransitions() as $transition) {
            $transitionConfig = [
                'from' => $transition->getFrom(),
                'to' => $transition->getTo(),
            ];

            $options = [];
            if ($transition->getLabel()) {
                $options['label'] = $transition->getLabel();
            }
            if ($transition->getIconClass()) {
                $options['iconClass'] = $transition->getIconClass();
            }
            if ($transition->getObjectLayout()) {
                $options['objectLayout'] = $transition->getObjectLayout();
            }
            if (!empty($transition->getNotes())) {
                $options['notes'] = $transition->getNotes();
            }
            if (!empty($transition->getNotificationSettings())) {
                $options['notificationSettings'] = $transition->getNotificationSettings();
            }
            if ($transition->getChangePublicationState()) {
                $options['changePublishedState'] = $transition->getChangePublicationState();
            }

            if (!empty($options)) {
                $transitionConfig['options'] = $options;
            }

            if (!empty($transition->getGuard())) {
                $transitionConfig['guard'] = $transition->getGuard();
            }

            $transitionsConfig[$transition->getName()] = $transitionConfig;
        }
        $config['transitions'] = $transitionsConfig;

        // Global actions
        if (!empty($workflow->getGlobalActions())) {
            $config['globalActions'] = $workflow->getGlobalActions();
        }

        return [
            'pimcore' => [
                'workflows' => [
                    $workflow->getName() => $config,
                ],
            ],
        ];
    }

    /**
     * Validate imported workflow structure.
     */
    public function validateImport(Workflow $workflow): array
    {
        $issues = [];

        if (empty($workflow->getName())) {
            $issues[] = 'Workflow name is missing';
        }
        if (empty($workflow->getPlaces())) {
            $issues[] = 'No places defined';
        }
        if (empty($workflow->getInitialMarking())) {
            $issues[] = 'No initial marking defined';
        }
        if (empty($workflow->getSupports())) {
            $issues[] = 'No supported classes defined';
        }

        return $issues;
    }
}

