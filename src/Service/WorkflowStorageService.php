<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use Symfony\Component\Filesystem\Filesystem;

/**
 * Service for storing and retrieving workflow definitions.
 */
class WorkflowStorageService
{
    private Filesystem $filesystem;
    private string $storagePath;
    private string $publishPath;
    private int $maxVersions;

    public function __construct(
        string $storagePath,
        string $publishPath,
        int $maxVersions = 20
    ) {
        $this->filesystem = new Filesystem();
        $this->storagePath = $storagePath;
        $this->publishPath = $publishPath;
        $this->maxVersions = $maxVersions;
        
        $this->ensureDirectories();
    }

    private function ensureDirectories(): void
    {
        $directories = [
            $this->storagePath,
            $this->getDraftsPath(),
            $this->getVersionsPath(),
            $this->getBackupsPath(),
            $this->publishPath,
        ];

        foreach ($directories as $directory) {
            if (!$this->filesystem->exists($directory)) {
                $this->filesystem->mkdir($directory, 0755);
            }
        }
    }

    public function getDraftsPath(): string
    {
        return $this->storagePath . '/drafts';
    }

    public function getVersionsPath(): string
    {
        return $this->storagePath . '/versions';
    }

    public function getBackupsPath(): string
    {
        return $this->storagePath . '/backups';
    }

    /**
     * List all workflow drafts.
     *
     * @return Workflow[]
     */
    public function listDrafts(): array
    {
        $drafts = [];
        $path = $this->getDraftsPath();
        
        if (!is_dir($path)) {
            return $drafts;
        }

        $files = glob($path . '/*.json');
        foreach ($files as $file) {
            $content = file_get_contents($file);
            if ($content) {
                $data = json_decode($content, true);
                if ($data) {
                    $drafts[] = Workflow::fromArray($data);
                }
            }
        }

        return $drafts;
    }

    /**
     * Get a workflow draft by ID.
     */
    public function getDraft(string $id): ?Workflow
    {
        $path = $this->getDraftsPath() . '/' . $id . '.json';
        
        if (!file_exists($path)) {
            return null;
        }

        $content = file_get_contents($path);
        if (!$content) {
            return null;
        }

        $data = json_decode($content, true);
        if (!$data) {
            return null;
        }

        return Workflow::fromArray($data);
    }

    /**
     * Save a workflow draft.
     */
    public function saveDraft(Workflow $workflow): void
    {
        $path = $this->getDraftsPath() . '/' . $workflow->getId() . '.json';
        
        $content = json_encode($workflow->jsonSerialize(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        $this->filesystem->dumpFile($path, $content);
    }

    /**
     * Delete a workflow draft.
     */
    public function deleteDraft(string $id): bool
    {
        $path = $this->getDraftsPath() . '/' . $id . '.json';
        
        if (!file_exists($path)) {
            return false;
        }

        $this->filesystem->remove($path);
        return true;
    }

    /**
     * Create a version snapshot of a workflow.
     */
    public function createVersion(Workflow $workflow): int
    {
        $workflowVersionsPath = $this->getVersionsPath() . '/' . $workflow->getId();
        
        if (!$this->filesystem->exists($workflowVersionsPath)) {
            $this->filesystem->mkdir($workflowVersionsPath, 0755);
        }

        // Get next version number
        $versions = $this->getVersions($workflow->getId());
        $nextVersion = count($versions) > 0 ? max(array_keys($versions)) + 1 : 1;

        $versionPath = $workflowVersionsPath . '/v' . $nextVersion . '.json';
        
        $workflow->setVersion($nextVersion);
        $content = json_encode($workflow->jsonSerialize(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        $this->filesystem->dumpFile($versionPath, $content);

        // Cleanup old versions if exceeding max
        $this->cleanupOldVersions($workflow->getId());

        return $nextVersion;
    }

    /**
     * Get all versions of a workflow.
     *
     * @return array<int, Workflow>
     */
    public function getVersions(string $workflowId): array
    {
        $versions = [];
        $workflowVersionsPath = $this->getVersionsPath() . '/' . $workflowId;
        
        if (!is_dir($workflowVersionsPath)) {
            return $versions;
        }

        $files = glob($workflowVersionsPath . '/v*.json');
        foreach ($files as $file) {
            preg_match('/v(\d+)\.json$/', $file, $matches);
            if (isset($matches[1])) {
                $versionNum = (int) $matches[1];
                $content = file_get_contents($file);
                if ($content) {
                    $data = json_decode($content, true);
                    if ($data) {
                        $versions[$versionNum] = Workflow::fromArray($data);
                    }
                }
            }
        }

        ksort($versions);
        return $versions;
    }

    /**
     * Get a specific version of a workflow.
     */
    public function getVersion(string $workflowId, int $version): ?Workflow
    {
        $path = $this->getVersionsPath() . '/' . $workflowId . '/v' . $version . '.json';
        
        if (!file_exists($path)) {
            return null;
        }

        $content = file_get_contents($path);
        if (!$content) {
            return null;
        }

        $data = json_decode($content, true);
        if (!$data) {
            return null;
        }

        return Workflow::fromArray($data);
    }

    /**
     * Restore a specific version as the current draft.
     */
    public function restoreVersion(string $workflowId, int $version): ?Workflow
    {
        $workflow = $this->getVersion($workflowId, $version);
        if (!$workflow) {
            return null;
        }

        // Reset status to draft
        $workflow->setStatus('draft');
        $workflow->setVersion(null);
        
        $this->saveDraft($workflow);
        
        return $workflow;
    }

    /**
     * Cleanup old versions exceeding the max limit.
     */
    private function cleanupOldVersions(string $workflowId): void
    {
        $versions = $this->getVersions($workflowId);
        
        if (count($versions) <= $this->maxVersions) {
            return;
        }

        $toDelete = array_slice(array_keys($versions), 0, count($versions) - $this->maxVersions);
        
        foreach ($toDelete as $versionNum) {
            $path = $this->getVersionsPath() . '/' . $workflowId . '/v' . $versionNum . '.json';
            $this->filesystem->remove($path);
        }
    }

    /**
     * Get workflow draft by name.
     */
    public function getDraftByName(string $name): ?Workflow
    {
        $drafts = $this->listDrafts();
        foreach ($drafts as $draft) {
            if ($draft->getName() === $name) {
                return $draft;
            }
        }
        return null;
    }

    /**
     * Check if a workflow name is unique among drafts.
     */
    public function isNameUnique(string $name, ?string $excludeId = null): bool
    {
        $drafts = $this->listDrafts();
        foreach ($drafts as $draft) {
            if ($draft->getName() === $name && $draft->getId() !== $excludeId) {
                return false;
            }
        }
        return true;
    }
}

