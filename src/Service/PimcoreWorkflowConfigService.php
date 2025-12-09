<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use Pimcore\Model\User;
use Pimcore\Model\User\Role;
use Pimcore\Model\User\Permission\Definition;
use Pimcore\Db;
use Symfony\Component\DependencyInjection\ServiceLocator;

/**
 * Service for interacting with Pimcore system configuration.
 */
class PimcoreWorkflowConfigService
{
    private ?ServiceLocator $supportStrategyLocator;

    public function __construct(?ServiceLocator $supportStrategyLocator = null)
    {
        $this->supportStrategyLocator = $supportStrategyLocator;
    }
    /**
     * Get all available Pimcore DataObject classes.
     */
    public function getDataObjectClasses(): array
    {
        $classes = [];
        
        try {
            $classesList = new \Pimcore\Model\DataObject\ClassDefinition\Listing();
            foreach ($classesList->load() as $class) {
                $classes[] = [
                    'id' => $class->getId(),
                    'name' => $class->getName(),
                    'fullClass' => 'Pimcore\\Model\\DataObject\\' . $class->getName(),
                ];
            }
        } catch (\Exception $e) {
            // Return empty array on error
        }

        // Add Asset and Document classes
        $classes[] = [
            'id' => 'asset',
            'name' => 'Asset',
            'fullClass' => 'Pimcore\\Model\\Asset',
        ];
        $classes[] = [
            'id' => 'document',
            'name' => 'Document',
            'fullClass' => 'Pimcore\\Model\\Document',
        ];

        return $classes;
    }

    /**
     * Get all available user roles.
     */
    public function getUserRoles(): array
    {
        $roles = [];
        
        try {
            $roleList = new Role\Listing();
            foreach ($roleList->load() as $role) {
                $roles[] = [
                    'id' => $role->getId(),
                    'name' => $role->getName(),
                ];
            }
        } catch (\Exception $e) {
            // Return empty array on error
        }

        return $roles;
    }

    /**
     * Get all available users.
     */
    public function getUsers(): array
    {
        $users = [];
        
        try {
            $userList = new User\Listing();
            $userList->setCondition('type = ?', ['user']);
            foreach ($userList->load() as $user) {
                $users[] = [
                    'id' => $user->getId(),
                    'name' => $user->getName(),
                    'email' => $user->getEmail(),
                    'firstname' => $user->getFirstname(),
                    'lastname' => $user->getLastname(),
                    'active' => $user->getActive(),
                ];
            }
        } catch (\Exception $e) {
            // Return empty array on error
        }

        return $users;
    }

    /**
     * Get all available permissions.
     */
    public function getPermissions(): array
    {
        $permissions = [];
        
        try {
            $db = Db::get();
            $result = $db->fetchAllAssociative('SELECT `key`, category FROM users_permission_definitions ORDER BY category, `key`');
            
            foreach ($result as $row) {
                $permissions[] = [
                    'key' => $row['key'],
                    'category' => $row['category'] ?? 'General',
                ];
            }
        } catch (\Exception $e) {
            // Fallback to some common permissions
            $permissions = [
                ['key' => 'assets', 'category' => 'General'],
                ['key' => 'documents', 'category' => 'General'],
                ['key' => 'objects', 'category' => 'General'],
                ['key' => 'publish', 'category' => 'General'],
            ];
        }

        return $permissions;
    }

    /**
     * Get available object layouts.
     */
    public function getObjectLayouts(): array
    {
        $layouts = [];
        
        try {
            $classesList = new \Pimcore\Model\DataObject\ClassDefinition\Listing();
            foreach ($classesList->load() as $class) {
                $classLayouts = $class->getLayoutDefinitions();
                if ($classLayouts) {
                    $layouts[$class->getName()] = [
                        'className' => $class->getName(),
                        'layouts' => $this->extractLayoutNames($class),
                    ];
                }
            }
        } catch (\Exception $e) {
            // Return empty array on error
        }

        return $layouts;
    }

    private function extractLayoutNames(\Pimcore\Model\DataObject\ClassDefinition $class): array
    {
        $layouts = [];
        
        // Get custom layouts
        try {
            $customLayoutList = new \Pimcore\Model\DataObject\ClassDefinition\CustomLayout\Listing();
            $customLayoutList->setCondition('classId = ?', [$class->getId()]);
            foreach ($customLayoutList->load() as $layout) {
                $layouts[] = [
                    'id' => $layout->getId(),
                    'name' => $layout->getName(),
                ];
            }
        } catch (\Exception $e) {
            // Ignore errors
        }

        return $layouts;
    }

    /**
     * Get available Pimcore icon classes.
     */
    public function getIconClasses(): array
    {
        return [
            // Status icons
            ['class' => 'pimcore_icon_accept', 'label' => 'Accept'],
            ['class' => 'pimcore_icon_cancel', 'label' => 'Cancel'],
            ['class' => 'pimcore_icon_warning', 'label' => 'Warning'],
            ['class' => 'pimcore_icon_info', 'label' => 'Info'],
            ['class' => 'pimcore_icon_error', 'label' => 'Error'],
            
            // Action icons
            ['class' => 'pimcore_icon_add', 'label' => 'Add'],
            ['class' => 'pimcore_icon_delete', 'label' => 'Delete'],
            ['class' => 'pimcore_icon_edit', 'label' => 'Edit'],
            ['class' => 'pimcore_icon_save', 'label' => 'Save'],
            ['class' => 'pimcore_icon_publish', 'label' => 'Publish'],
            ['class' => 'pimcore_icon_unpublish', 'label' => 'Unpublish'],
            
            // Navigation icons
            ['class' => 'pimcore_icon_arrow_right', 'label' => 'Arrow Right'],
            ['class' => 'pimcore_icon_arrow_left', 'label' => 'Arrow Left'],
            ['class' => 'pimcore_icon_arrow_up', 'label' => 'Arrow Up'],
            ['class' => 'pimcore_icon_arrow_down', 'label' => 'Arrow Down'],
            
            // Object icons
            ['class' => 'pimcore_icon_object', 'label' => 'Object'],
            ['class' => 'pimcore_icon_document', 'label' => 'Document'],
            ['class' => 'pimcore_icon_asset', 'label' => 'Asset'],
            ['class' => 'pimcore_icon_folder', 'label' => 'Folder'],
            
            // Workflow icons
            ['class' => 'pimcore_icon_workflow', 'label' => 'Workflow'],
            ['class' => 'pimcore_icon_workflow_action', 'label' => 'Workflow Action'],
            
            // User icons
            ['class' => 'pimcore_icon_user', 'label' => 'User'],
            ['class' => 'pimcore_icon_roles', 'label' => 'Roles'],
            
            // Other icons
            ['class' => 'pimcore_icon_email', 'label' => 'Email'],
            ['class' => 'pimcore_icon_schedule', 'label' => 'Schedule'],
            ['class' => 'pimcore_icon_clock', 'label' => 'Clock'],
            ['class' => 'pimcore_icon_lock', 'label' => 'Lock'],
            ['class' => 'pimcore_icon_unlock', 'label' => 'Unlock'],
        ];
    }

    /**
     * Get available colors for workflow places.
     */
    public function getPlaceColors(): array
    {
        return [
            ['value' => '#1abc9c', 'label' => 'Turquoise'],
            ['value' => '#2ecc71', 'label' => 'Emerald'],
            ['value' => '#3498db', 'label' => 'Peter River'],
            ['value' => '#9b59b6', 'label' => 'Amethyst'],
            ['value' => '#34495e', 'label' => 'Wet Asphalt'],
            ['value' => '#f1c40f', 'label' => 'Sun Flower'],
            ['value' => '#e67e22', 'label' => 'Carrot'],
            ['value' => '#e74c3c', 'label' => 'Alizarin'],
            ['value' => '#95a5a6', 'label' => 'Concrete'],
            ['value' => '#7f8c8d', 'label' => 'Asbestos'],
        ];
    }

    /**
     * Get existing workflows from Pimcore configuration.
     */
    public function getExistingWorkflows(): array
    {
        $workflows = [];
        
        try {
            $config = \Pimcore::getContainer()->getParameter('pimcore.workflows');
            
            if (is_array($config)) {
                foreach ($config as $name => $workflowConfig) {
                    $workflows[] = [
                        'name' => $name,
                        'type' => $workflowConfig['type'] ?? 'workflow',
                        'supports' => $workflowConfig['supports'] ?? [],
                    ];
                }
            }
        } catch (\Exception $e) {
            // Return empty array if config not available
        }

        return $workflows;
    }

    /**
     * Get available notification channel types.
     */
    public function getNotificationChannelTypes(): array
    {
        return [
            ['type' => 'mail', 'label' => 'Email'],
            ['type' => 'pimcore_notification', 'label' => 'Pimcore Notification'],
        ];
    }

    /**
     * Get available mail templates/documents.
     */
    public function getMailDocuments(): array
    {
        $documents = [];
        
        try {
            // Get email documents
            $list = new \Pimcore\Model\Document\Listing();
            $list->setCondition('type = ?', ['email']);
            
            foreach ($list->load() as $doc) {
                $documents[] = [
                    'id' => $doc->getId(),
                    'path' => $doc->getRealFullPath(),
                    'key' => $doc->getKey(),
                ];
            }
        } catch (\Exception $e) {
            // Return empty array on error
        }

        return $documents;
    }

    /**
     * Get available publication states.
     */
    public function getPublicationStates(): array
    {
        return [
            ['value' => 'no_change', 'label' => 'No Change'],
            ['value' => 'force_published', 'label' => 'Force Published'],
            ['value' => 'force_unpublished', 'label' => 'Force Unpublished'],
            ['value' => 'save_version', 'label' => 'Save Version Only'],
        ];
    }

    /**
     * Get available support strategy services implementing WorkflowSupportStrategyInterface.
     */
    public function getSupportStrategyServices(): array
    {
        $services = [];

        if ($this->supportStrategyLocator !== null) {
            foreach ($this->supportStrategyLocator->getProvidedServices() as $serviceId => $serviceClass) {
                $services[] = [
                    'id' => $serviceId,
                    'class' => $serviceClass,
                    'label' => $this->formatServiceLabel($serviceId),
                ];
            }
        }

        return $services;
    }

    /**
     * Format a service ID into a human-readable label.
     */
    private function formatServiceLabel(string $serviceId): string
    {
        // Extract class name from fully qualified name
        $parts = explode('\\', $serviceId);
        $className = end($parts);
        
        // Convert CamelCase to words
        $label = preg_replace('/(?<!^)([A-Z])/', ' $1', $className);
        
        // Remove common suffixes
        $label = preg_replace('/(Support\s*)?Strategy$/i', '', $label);
        
        return trim($label) ?: $className;
    }

    /**
     * Get expression templates for support strategy expressions.
     */
    public function getExpressionTemplates(): array
    {
        return [
            [
                'id' => 'property_equals',
                'label' => 'Property equals value',
                'expression' => "subject.getPropertyName() == 'value'",
                'description' => 'Check if a property equals a specific value',
                'placeholders' => ['PropertyName', 'value'],
            ],
            [
                'id' => 'property_not_empty',
                'label' => 'Property is not empty',
                'expression' => "subject.getPropertyName() !== null and subject.getPropertyName() !== ''",
                'description' => 'Check if a property has a value',
                'placeholders' => ['PropertyName'],
            ],
            [
                'id' => 'is_published',
                'label' => 'Object is published',
                'expression' => 'subject.isPublished() == true',
                'description' => 'Check if the object is published',
                'placeholders' => [],
            ],
            [
                'id' => 'is_not_published',
                'label' => 'Object is not published',
                'expression' => 'subject.isPublished() == false',
                'description' => 'Check if the object is not published (draft)',
                'placeholders' => [],
            ],
            [
                'id' => 'path_starts_with',
                'label' => 'Path starts with',
                'expression' => "subject.getPath() starts with '/folder/'",
                'description' => 'Check if object is in a specific folder',
                'placeholders' => ['/folder/'],
            ],
            [
                'id' => 'class_name',
                'label' => 'Class name equals',
                'expression' => "subject.getClassName() == 'Product'",
                'description' => 'Check if the object class matches',
                'placeholders' => ['Product'],
            ],
            [
                'id' => 'has_parent',
                'label' => 'Has specific parent',
                'expression' => 'subject.getParentId() == 123',
                'description' => 'Check if object has a specific parent ID',
                'placeholders' => ['123'],
            ],
            [
                'id' => 'property_in_list',
                'label' => 'Property value in list',
                'expression' => "subject.getStatus() in ['draft', 'review']",
                'description' => 'Check if property value is in a list',
                'placeholders' => ['Status', 'draft', 'review'],
            ],
            [
                'id' => 'combined_conditions',
                'label' => 'Combined conditions',
                'expression' => "subject.getType() == 'article' and subject.isPublished() == false",
                'description' => 'Combine multiple conditions with and/or',
                'placeholders' => ['Type', 'article'],
            ],
            [
                'id' => 'relation_exists',
                'label' => 'Relation exists',
                'expression' => 'subject.getRelationField() !== null',
                'description' => 'Check if a relation field has a value',
                'placeholders' => ['RelationField'],
            ],
        ];
    }

    /**
     * Get autocomplete suggestions for expression building.
     */
    public function getExpressionAutocompleteSuggestions(): array
    {
        return [
            'methods' => [
                ['value' => 'subject.getId()', 'label' => 'Get object ID', 'returnType' => 'int'],
                ['value' => 'subject.getKey()', 'label' => 'Get object key', 'returnType' => 'string'],
                ['value' => 'subject.getPath()', 'label' => 'Get object path', 'returnType' => 'string'],
                ['value' => 'subject.getFullPath()', 'label' => 'Get full path with key', 'returnType' => 'string'],
                ['value' => 'subject.getParentId()', 'label' => 'Get parent ID', 'returnType' => 'int'],
                ['value' => 'subject.getClassName()', 'label' => 'Get class name', 'returnType' => 'string'],
                ['value' => 'subject.isPublished()', 'label' => 'Check if published', 'returnType' => 'bool'],
                ['value' => 'subject.getCreationDate()', 'label' => 'Get creation timestamp', 'returnType' => 'int'],
                ['value' => 'subject.getModificationDate()', 'label' => 'Get modification timestamp', 'returnType' => 'int'],
                ['value' => 'subject.getUserOwner()', 'label' => 'Get owner user ID', 'returnType' => 'int'],
                ['value' => 'subject.getUserModification()', 'label' => 'Get modifier user ID', 'returnType' => 'int'],
            ],
            'operators' => [
                ['value' => '==', 'label' => 'Equals'],
                ['value' => '!=', 'label' => 'Not equals'],
                ['value' => '>', 'label' => 'Greater than'],
                ['value' => '<', 'label' => 'Less than'],
                ['value' => '>=', 'label' => 'Greater or equal'],
                ['value' => '<=', 'label' => 'Less or equal'],
                ['value' => 'in', 'label' => 'In array'],
                ['value' => 'not in', 'label' => 'Not in array'],
                ['value' => 'matches', 'label' => 'Regex matches'],
                ['value' => 'starts with', 'label' => 'Starts with'],
                ['value' => 'ends with', 'label' => 'Ends with'],
                ['value' => 'contains', 'label' => 'Contains'],
            ],
            'logical' => [
                ['value' => 'and', 'label' => 'Logical AND'],
                ['value' => 'or', 'label' => 'Logical OR'],
                ['value' => 'not', 'label' => 'Logical NOT'],
            ],
            'functions' => [
                ['value' => 'is_granted(\'ROLE_NAME\')', 'label' => 'Check user role', 'description' => 'Check if current user has role'],
            ],
        ];
    }
}

