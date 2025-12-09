<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Controller\Admin;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Place;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Transition;
use PraetorianDigital\WorkflowDesignerProBundle\Service\WorkflowStorageService;
use PraetorianDigital\WorkflowDesignerProBundle\Service\WorkflowValidationService;
use PraetorianDigital\WorkflowDesignerProBundle\Service\WorkflowPublishService;
use PraetorianDigital\WorkflowDesignerProBundle\Service\WorkflowSimulationService;
use PraetorianDigital\WorkflowDesignerProBundle\Service\WorkflowImportExportService;
use PraetorianDigital\WorkflowDesignerProBundle\Service\PimcoreWorkflowConfigService;
use Pimcore\Bundle\AdminBundle\Controller\AdminAbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/workflow-designer', name: 'workflow_designer_pro_admin_')]
class WorkflowController extends AdminAbstractController
{
    public function __construct(
        private readonly WorkflowStorageService $storageService,
        private readonly WorkflowValidationService $validationService,
        private readonly WorkflowPublishService $publishService,
        private readonly WorkflowSimulationService $simulationService,
        private readonly WorkflowImportExportService $importExportService,
        private readonly PimcoreWorkflowConfigService $configService,
    ) {
    }

    #[Route('/list', name: 'list', methods: ['GET'], options: ['expose' => true])]
    public function listAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $drafts = $this->storageService->listDrafts();
        $published = $this->publishService->listPublished();

        $data = [];
        foreach ($drafts as $workflow) {
            $data[] = [
                'id' => $workflow->getId(),
                'name' => $workflow->getName(),
                'type' => $workflow->getType(),
                'supports' => $workflow->getSupports(),
                'status' => $workflow->getStatus(),
                'placesCount' => count($workflow->getPlaces()),
                'transitionsCount' => count($workflow->getTransitions()),
                'createdAt' => $workflow->getCreatedAt()?->format('c'),
                'updatedAt' => $workflow->getUpdatedAt()?->format('c'),
                'isPublished' => $this->publishService->isPublished($workflow->getName()),
            ];
        }

        return $this->adminJson([
            'success' => true,
            'data' => $data,
            'published' => $published,
        ]);
    }

    #[Route('/get/{id}', name: 'get', methods: ['GET'], options: ['expose' => true])]
    public function getAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->adminJson([
            'success' => true,
            'data' => $workflow->jsonSerialize(),
        ]);
    }

    #[Route('/create', name: 'create', methods: ['POST'], options: ['expose' => true])]
    public function createAction(Request $request): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $data = json_decode($request->getContent(), true) ?? [];
        $name = $data['name'] ?? '';

        if (empty($name)) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow name is required',
            ], Response::HTTP_BAD_REQUEST);
        }

        // Check name uniqueness
        if (!$this->storageService->isNameUnique($name)) {
            return $this->adminJson([
                'success' => false,
                'message' => sprintf('A workflow with name "%s" already exists', $name),
            ], Response::HTTP_CONFLICT);
        }

        $workflow = new Workflow($name);
        
        if (isset($data['type'])) {
            $workflow->setType($data['type']);
        }
        if (isset($data['supports'])) {
            $workflow->setSupports($data['supports']);
        }
        if (isset($data['initialMarking'])) {
            $workflow->setInitialMarking($data['initialMarking']);
        }

        $this->storageService->saveDraft($workflow);

        return $this->adminJson([
            'success' => true,
            'data' => $workflow->jsonSerialize(),
            'message' => sprintf('Workflow "%s" created successfully', $name),
        ]);
    }

    #[Route('/save/{id}', name: 'save', methods: ['PUT', 'POST'], options: ['expose' => true])]
    public function saveAction(string $id, Request $request): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        // Check name uniqueness if changed
        if (isset($data['name']) && $data['name'] !== $workflow->getName()) {
            if (!$this->storageService->isNameUnique($data['name'], $id)) {
                return $this->adminJson([
                    'success' => false,
                    'message' => sprintf('A workflow with name "%s" already exists', $data['name']),
                ], Response::HTTP_CONFLICT);
            }
        }

        // Update workflow properties
        $this->updateWorkflowFromData($workflow, $data);

        // Reset status to draft if modified
        $workflow->setStatus('draft');

        $this->storageService->saveDraft($workflow);

        // Validate and return warnings
        $validationResults = $this->validationService->validate($workflow);

        return $this->adminJson([
            'success' => true,
            'data' => $workflow->jsonSerialize(),
            'validation' => $validationResults,
            'message' => 'Workflow saved successfully',
        ]);
    }

    #[Route('/delete/{id}', name: 'delete', methods: ['DELETE'], options: ['expose' => true])]
    public function deleteAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        // Unpublish if published
        if ($this->publishService->isPublished($workflow->getName())) {
            $this->publishService->unpublish($workflow->getName());
        }

        $this->storageService->deleteDraft($id);

        return $this->adminJson([
            'success' => true,
            'message' => sprintf('Workflow "%s" deleted successfully', $workflow->getName()),
        ]);
    }

    #[Route('/validate/{id}', name: 'validate', methods: ['POST'], options: ['expose' => true])]
    public function validateAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $results = $this->validationService->validate($workflow);
        $hasErrors = $this->validationService->hasErrors($results);

        return $this->adminJson([
            'success' => true,
            'valid' => !$hasErrors,
            'results' => $results,
            'errors' => $this->validationService->filterByType($results, 'error'),
            'warnings' => $this->validationService->filterByType($results, 'warning'),
            'info' => $this->validationService->filterByType($results, 'info'),
        ]);
    }

    #[Route('/publish/{id}', name: 'publish', methods: ['POST'], options: ['expose' => true])]
    public function publishAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer_publish');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        // Validate before publishing
        $validationResults = $this->validationService->validate($workflow);
        if ($this->validationService->hasErrors($validationResults)) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow has validation errors and cannot be published',
                'validation' => $validationResults,
            ], Response::HTTP_BAD_REQUEST);
        }

        $result = $this->publishService->publish($workflow, $this->storageService);

        return $this->adminJson($result);
    }

    #[Route('/unpublish/{id}', name: 'unpublish', methods: ['POST'], options: ['expose' => true])]
    public function unpublishAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer_publish');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $result = $this->publishService->unpublish($workflow->getName());

        if ($result['success']) {
            $workflow->setStatus('draft');
            $this->storageService->saveDraft($workflow);
        }

        return $this->adminJson($result);
    }

    #[Route('/preview/{id}', name: 'preview', methods: ['GET'], options: ['expose' => true])]
    public function previewAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $yaml = $this->publishService->generatePimcoreWorkflowYaml($workflow);
        $diff = $this->publishService->getDiff($workflow);

        return $this->adminJson([
            'success' => true,
            'yaml' => $yaml,
            'diff' => $diff,
            'isPublished' => $this->publishService->isPublished($workflow->getName()),
        ]);
    }

    #[Route('/versions/{id}', name: 'versions', methods: ['GET'], options: ['expose' => true])]
    public function versionsAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $versions = $this->storageService->getVersions($id);
        
        $data = [];
        foreach ($versions as $version => $workflow) {
            $data[] = [
                'version' => $version,
                'name' => $workflow->getName(),
                'status' => $workflow->getStatus(),
                'updatedAt' => $workflow->getUpdatedAt()?->format('c'),
            ];
        }

        return $this->adminJson([
            'success' => true,
            'data' => $data,
        ]);
    }

    #[Route('/restore/{id}/{version}', name: 'restore', methods: ['POST'], options: ['expose' => true])]
    public function restoreAction(string $id, int $version): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->restoreVersion($id, $version);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Version not found',
            ], Response::HTTP_NOT_FOUND);
        }

        return $this->adminJson([
            'success' => true,
            'data' => $workflow->jsonSerialize(),
            'message' => sprintf('Version %d restored successfully', $version),
        ]);
    }

    #[Route('/simulate/{id}', name: 'simulate', methods: ['POST'], options: ['expose' => true])]
    public function simulateAction(string $id, Request $request): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $currentPlace = $data['currentPlace'] ?? null;
        $transition = $data['transition'] ?? null;

        if ($transition) {
            $result = $this->simulationService->executeTransition($workflow, $currentPlace, $transition);
        } else {
            $result = $this->simulationService->simulate($workflow, $currentPlace);
        }

        return $this->adminJson([
            'success' => true,
            'simulation' => $result,
        ]);
    }

    #[Route('/analyze/{id}', name: 'analyze', methods: ['GET'], options: ['expose' => true])]
    public function analyzeAction(string $id): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $analysis = $this->simulationService->getReachabilityAnalysis($workflow);
        $paths = $this->simulationService->tracePaths($workflow, 20);

        return $this->adminJson([
            'success' => true,
            'analysis' => $analysis,
            'paths' => $paths,
        ]);
    }

    #[Route('/export/{id}', name: 'export', methods: ['GET'], options: ['expose' => true])]
    public function exportAction(string $id, Request $request): Response
    {
        $this->checkPermission('workflow_designer');

        $workflow = $this->storageService->getDraft($id);

        if (!$workflow) {
            return new JsonResponse([
                'success' => false,
                'message' => 'Workflow not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $format = $request->query->get('format', 'json');

        if ($format === 'yaml') {
            $content = $this->importExportService->exportToYaml($workflow);
            $contentType = 'application/x-yaml';
            $extension = 'yaml';
        } else {
            $content = $this->importExportService->exportToJson($workflow);
            $contentType = 'application/json';
            $extension = 'json';
        }

        $response = new Response($content);
        $response->headers->set('Content-Type', $contentType);
        $response->headers->set('Content-Disposition', sprintf(
            'attachment; filename="%s.%s"',
            $workflow->getName(),
            $extension
        ));

        return $response;
    }

    #[Route('/import', name: 'import', methods: ['POST'], options: ['expose' => true])]
    public function importAction(Request $request): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        $content = null;
        $format = 'json';

        // Check if this is a file upload
        $uploadedFile = $request->files->get('file');
        if ($uploadedFile) {
            // File upload
            $content = file_get_contents($uploadedFile->getPathname());
            $extension = strtolower($uploadedFile->getClientOriginalExtension());
            $format = in_array($extension, ['yaml', 'yml']) ? 'yaml' : 'json';
        } else {
            // Raw content in body
            $content = $request->getContent();
            $contentType = $request->headers->get('Content-Type', 'application/json');
            if (str_contains($contentType, 'yaml') || str_contains($contentType, 'yml')) {
                $format = 'yaml';
            }
        }

        if (empty($content)) {
            return $this->adminJson([
                'success' => false,
                'message' => 'No content provided',
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            if ($format === 'yaml') {
                $workflow = $this->importExportService->importFromYaml($content);
            } else {
                $workflow = $this->importExportService->importFromJson($content);
            }

            // Validate import
            $issues = $this->importExportService->validateImport($workflow);
            if (!empty($issues)) {
                return $this->adminJson([
                    'success' => false,
                    'message' => 'Import validation failed',
                    'issues' => $issues,
                ], Response::HTTP_BAD_REQUEST);
            }

            // Check name uniqueness
            if (!$this->storageService->isNameUnique($workflow->getName())) {
                // Generate unique name
                $baseName = $workflow->getName();
                $counter = 1;
                while (!$this->storageService->isNameUnique($baseName . '_' . $counter)) {
                    $counter++;
                }
                $workflow->setName($baseName . '_' . $counter);
            }

            $this->storageService->saveDraft($workflow);

            return $this->adminJson([
                'success' => true,
                'data' => $workflow->jsonSerialize(),
                'message' => sprintf('Workflow "%s" imported successfully', $workflow->getName()),
            ]);
        } catch (\Exception $e) {
            return $this->adminJson([
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }
    }

    #[Route('/config/classes', name: 'config_classes', methods: ['GET'], options: ['expose' => true])]
    public function configClassesAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getDataObjectClasses(),
        ]);
    }

    #[Route('/config/roles', name: 'config_roles', methods: ['GET'], options: ['expose' => true])]
    public function configRolesAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getUserRoles(),
        ]);
    }

    #[Route('/config/users', name: 'config_users', methods: ['GET'], options: ['expose' => true])]
    public function configUsersAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getUsers(),
        ]);
    }

    #[Route('/config/permissions', name: 'config_permissions', methods: ['GET'], options: ['expose' => true])]
    public function configPermissionsAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getPermissions(),
        ]);
    }

    #[Route('/config/icons', name: 'config_icons', methods: ['GET'], options: ['expose' => true])]
    public function configIconsAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getIconClasses(),
        ]);
    }

    #[Route('/config/colors', name: 'config_colors', methods: ['GET'], options: ['expose' => true])]
    public function configColorsAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => $this->configService->getPlaceColors(),
        ]);
    }

    #[Route('/config/all', name: 'config_all', methods: ['GET'], options: ['expose' => true])]
    public function configAllAction(): JsonResponse
    {
        $this->checkPermission('workflow_designer');

        return $this->adminJson([
            'success' => true,
            'data' => [
                'classes' => $this->configService->getDataObjectClasses(),
                'roles' => $this->configService->getUserRoles(),
                'users' => $this->configService->getUsers(),
                'permissions' => $this->configService->getPermissions(),
                'icons' => $this->configService->getIconClasses(),
                'colors' => $this->configService->getPlaceColors(),
                'layouts' => $this->configService->getObjectLayouts(),
                'notificationChannels' => $this->configService->getNotificationChannelTypes(),
                'mailDocuments' => $this->configService->getMailDocuments(),
                'publicationStates' => $this->configService->getPublicationStates(),
                'existingWorkflows' => $this->configService->getExistingWorkflows(),
            ],
        ]);
    }

    /**
     * Update workflow model from request data.
     */
    private function updateWorkflowFromData(Workflow $workflow, array $data): void
    {
        if (isset($data['name'])) {
            $workflow->setName($data['name']);
        }
        if (isset($data['type'])) {
            $workflow->setType($data['type']);
        }
        if (isset($data['supports'])) {
            $workflow->setSupports($data['supports']);
        }
        if (isset($data['supportStrategy'])) {
            $workflow->setSupportStrategy($data['supportStrategy']);
        }
        if (isset($data['initialMarking'])) {
            $workflow->setInitialMarking($data['initialMarking']);
        }
        if (isset($data['markingStore'])) {
            $ms = $data['markingStore'];
            $workflow->setMarkingStoreType($ms['type'] ?? 'method');
            $workflow->setMarkingStoreProperty($ms['property'] ?? 'state');
            $workflow->setMarkingStoreArguments($ms['arguments'] ?? []);
        }
        if (isset($data['auditTrailEnabled'])) {
            $workflow->setAuditTrailEnabled(filter_var($data['auditTrailEnabled'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($data['metadata'])) {
            $workflow->setMetadata($data['metadata']);
        }
        if (isset($data['globalActions'])) {
            $workflow->setGlobalActions($data['globalActions']);
        }

        // Update places
        if (isset($data['places'])) {
            $places = [];
            foreach ($data['places'] as $placeData) {
                $place = Place::fromArray($placeData);
                $places[$place->getName()] = $place;
            }
            $workflow->setPlaces($places);
        }

        // Update transitions
        if (isset($data['transitions'])) {
            $transitions = [];
            foreach ($data['transitions'] as $transitionData) {
                $transition = Transition::fromArray($transitionData);
                $transitions[$transition->getName()] = $transition;
            }
            $workflow->setTransitions($transitions);
        }
    }
}

