<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\PimcoreBundleAdminClassicInterface;
use Pimcore\Extension\Bundle\Traits\BundleAdminClassicTrait;
use Pimcore\Extension\Bundle\Installer\InstallerInterface;
use PraetorianDigital\WorkflowDesignerProBundle\Installer\Installer;

/**
 * Workflow Designer Pro Bundle
 *
 * Provides a visual workflow designer for Pimcore workflows based on Symfony Workflow.
 * Enables creating, editing, and managing workflows through a graphical user interface.
 */
class WorkflowDesignerProBundle extends AbstractPimcoreBundle implements PimcoreBundleAdminClassicInterface
{
    use BundleAdminClassicTrait;

    public const PERMISSION_WORKFLOW_DESIGNER = 'workflow_designer';
    public const PERMISSION_WORKFLOW_PUBLISH = 'workflow_designer_publish';

    public function getJsPaths(): array
    {
        return [
            '/bundles/workflowdesignerpro/js/pimcore/startup.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/panel.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/graph.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/support-strategy.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/editor.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/place.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/transition.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/guard.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/notification.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/simulation.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/import-export.js',
            '/bundles/workflowdesignerpro/js/pimcore/workflow/versions.js',
        ];
    }

    public function getCssPaths(): array
    {
        return [
            '/bundles/workflowdesignerpro/css/workflow-designer.css',
        ];
    }

    public function getEditmodeJsPaths(): array
    {
        return [];
    }

    public function getEditmodeCssPaths(): array
    {
        return [];
    }

    public function getInstaller(): ?InstallerInterface
    {
        return $this->container?->get(Installer::class);
    }

    public function getDescription(): string
    {
        return 'Visual Workflow Designer for Pimcore - Create, edit, and manage workflows with a graphical interface.';
    }

    public function getNiceName(): string
    {
        return 'Workflow Designer Pro';
    }

    /**
     * Returns the bundle path.
     * Required for bundles installed via Composer.
     */
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}

