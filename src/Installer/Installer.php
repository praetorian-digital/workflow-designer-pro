<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Installer;

use Pimcore\Extension\Bundle\Installer\AbstractInstaller;
use Pimcore\Extension\Bundle\Installer\Exception\InstallationException;
use Pimcore\Model\User\Permission\Definition;
use Symfony\Component\Filesystem\Filesystem;

class Installer extends AbstractInstaller
{
    private const PERMISSIONS = [
        'workflow_designer' => 'Workflow Designer - View and edit workflows',
        'workflow_designer_publish' => 'Workflow Designer - Publish workflows to configuration',
    ];

    public function install(): void
    {
        $this->installPermissions();
        $this->createStorageDirectories();
    }

    public function uninstall(): void
    {
        $this->removePermissions();
    }

    public function needsReloadAfterInstall(): bool
    {
        return true;
    }

    public function canBeInstalled(): bool
    {
        return !$this->isInstalled();
    }

    public function canBeUninstalled(): bool
    {
        return $this->isInstalled();
    }

    public function isInstalled(): bool
    {
        try {
            $definition = Definition::getByKey('workflow_designer');
            return $definition !== null;
        } catch (\Exception $e) {
            return false;
        }
    }

    private function installPermissions(): void
    {
        foreach (self::PERMISSIONS as $key => $description) {
            $permission = Definition::getByKey($key);
            if (!$permission) {
                $permission = new Definition();
                $permission->setKey($key);
                $permission->setCategory('Workflow Designer Pro');
                $permission->save();
            }
        }
    }

    private function removePermissions(): void
    {
        foreach (array_keys(self::PERMISSIONS) as $key) {
            try {
                $permission = Definition::getByKey($key);
                if ($permission) {
                    $permission->delete();
                }
            } catch (\Exception $e) {
                // Ignore errors during uninstall
            }
        }
    }

    private function createStorageDirectories(): void
    {
        $filesystem = new Filesystem();
        $projectDir = \Pimcore::getContainer()->getParameter('kernel.project_dir');
        
        $directories = [
            $projectDir . '/var/config/workflow_designer_pro',
            $projectDir . '/var/config/workflow_designer_pro/drafts',
            $projectDir . '/var/config/workflow_designer_pro/versions',
            $projectDir . '/var/config/workflow_designer_pro/backups',
            $projectDir . '/config/workflows',
        ];

        foreach ($directories as $directory) {
            if (!$filesystem->exists($directory)) {
                $filesystem->mkdir($directory, 0755);
            }
        }
    }
}

