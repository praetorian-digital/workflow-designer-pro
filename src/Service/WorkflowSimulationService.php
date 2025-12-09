<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Place;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Transition;
use Symfony\Component\Workflow\Definition;
use Symfony\Component\Workflow\DefinitionBuilder;
use Symfony\Component\Workflow\Transition as SymfonyTransition;
use Symfony\Component\Workflow\MarkingStore\MethodMarkingStore;
use Symfony\Component\Workflow\Workflow as SymfonyWorkflow;

/**
 * Service for simulating workflow execution.
 */
class WorkflowSimulationService
{
    /**
     * Simulate a workflow from the initial state.
     *
     * @return array{
     *     currentPlace: string,
     *     availableTransitions: array,
     *     path: array,
     *     error: string|null
     * }
     */
    public function simulate(Workflow $workflow, ?string $startPlace = null): array
    {
        $result = [
            'currentPlace' => $startPlace ?? $workflow->getInitialMarking(),
            'availableTransitions' => [],
            'path' => [],
            'error' => null,
        ];

        try {
            $currentPlace = $result['currentPlace'];
            if (!$currentPlace) {
                $result['error'] = 'No initial marking defined';
                return $result;
            }

            // Find available transitions from current place
            $result['availableTransitions'] = $this->getAvailableTransitions($workflow, $currentPlace);
            
        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    /**
     * Execute a transition in simulation mode.
     */
    public function executeTransition(Workflow $workflow, string $currentPlace, string $transitionName): array
    {
        $result = [
            'success' => false,
            'previousPlace' => $currentPlace,
            'currentPlace' => $currentPlace,
            'appliedTransition' => null,
            'availableTransitions' => [],
            'error' => null,
        ];

        try {
            $transition = $this->findTransition($workflow, $transitionName);
            
            if (!$transition) {
                $result['error'] = sprintf('Transition "%s" not found', $transitionName);
                return $result;
            }

            // Check if transition can be applied from current place
            if (!in_array($currentPlace, $transition->getFrom(), true)) {
                $result['error'] = sprintf(
                    'Transition "%s" cannot be applied from place "%s". Expected: %s',
                    $transitionName,
                    $currentPlace,
                    implode(', ', $transition->getFrom())
                );
                return $result;
            }

            // Apply transition (get first "to" place)
            $toPlaces = $transition->getTo();
            $newPlace = $toPlaces[0] ?? $currentPlace;

            $result['success'] = true;
            $result['currentPlace'] = $newPlace;
            $result['appliedTransition'] = [
                'name' => $transition->getName(),
                'label' => $transition->getLabel(),
                'from' => $transition->getFrom(),
                'to' => $transition->getTo(),
            ];
            $result['availableTransitions'] = $this->getAvailableTransitions($workflow, $newPlace);

        } catch (\Exception $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    /**
     * Get all available transitions from a given place.
     */
    public function getAvailableTransitions(Workflow $workflow, string $currentPlace): array
    {
        $available = [];

        foreach ($workflow->getTransitions() as $transition) {
            if (in_array($currentPlace, $transition->getFrom(), true)) {
                $available[] = [
                    'name' => $transition->getName(),
                    'label' => $transition->getLabel() ?? $transition->getName(),
                    'from' => $transition->getFrom(),
                    'to' => $transition->getTo(),
                    'guard' => $transition->getGuard(),
                    'hasGuard' => !empty($transition->getGuard()),
                ];
            }
        }

        return $available;
    }

    /**
     * Trace all possible paths through the workflow.
     */
    public function tracePaths(Workflow $workflow, int $maxDepth = 50): array
    {
        $initialPlace = $workflow->getInitialMarking();
        if (!$initialPlace) {
            return [];
        }

        $paths = [];
        $this->tracePathsRecursive($workflow, $initialPlace, [], $paths, $maxDepth, []);

        return $paths;
    }

    private function tracePathsRecursive(
        Workflow $workflow,
        string $currentPlace,
        array $currentPath,
        array &$allPaths,
        int $maxDepth,
        array $visited
    ): void {
        if (count($currentPath) >= $maxDepth) {
            $allPaths[] = array_merge($currentPath, [['place' => $currentPlace, 'transition' => null, 'truncated' => true]]);
            return;
        }

        // Cycle detection
        if (isset($visited[$currentPlace]) && $visited[$currentPlace] > 2) {
            $allPaths[] = array_merge($currentPath, [['place' => $currentPlace, 'transition' => null, 'cycle' => true]]);
            return;
        }

        $visited[$currentPlace] = ($visited[$currentPlace] ?? 0) + 1;
        $currentPath[] = ['place' => $currentPlace, 'transition' => null];

        $availableTransitions = $this->getAvailableTransitions($workflow, $currentPlace);

        if (empty($availableTransitions)) {
            // End state reached
            $allPaths[] = $currentPath;
            return;
        }

        foreach ($availableTransitions as $transition) {
            $pathWithTransition = $currentPath;
            $pathWithTransition[count($pathWithTransition) - 1]['transition'] = $transition['name'];

            foreach ($transition['to'] as $toPlace) {
                $this->tracePathsRecursive(
                    $workflow,
                    $toPlace,
                    $pathWithTransition,
                    $allPaths,
                    $maxDepth,
                    $visited
                );
            }
        }
    }

    /**
     * Build a Symfony Workflow Definition for testing.
     */
    public function buildSymfonyDefinition(Workflow $workflow): Definition
    {
        $builder = new DefinitionBuilder();

        // Add places
        foreach ($workflow->getPlaces() as $place) {
            $builder->addPlace($place->getName());
        }

        // Set initial marking
        if ($workflow->getInitialMarking()) {
            $builder->setInitialPlaces([$workflow->getInitialMarking()]);
        }

        // Add transitions
        foreach ($workflow->getTransitions() as $transition) {
            $symfonyTransition = new SymfonyTransition(
                $transition->getName(),
                $transition->getFrom(),
                $transition->getTo()
            );
            $builder->addTransition($symfonyTransition);
        }

        return $builder->build();
    }

    /**
     * Find a transition by name.
     */
    private function findTransition(Workflow $workflow, string $name): ?Transition
    {
        $transitions = $workflow->getTransitions();
        return $transitions[$name] ?? null;
    }

    /**
     * Validate the workflow can reach all places from initial marking.
     */
    public function getReachabilityAnalysis(Workflow $workflow): array
    {
        $analysis = [
            'reachable' => [],
            'unreachable' => [],
            'deadEnds' => [],
            'hasCycles' => false,
        ];

        $initialPlace = $workflow->getInitialMarking();
        if (!$initialPlace) {
            return $analysis;
        }

        // BFS to find all reachable places
        $visited = [$initialPlace];
        $queue = [$initialPlace];

        while (!empty($queue)) {
            $current = array_shift($queue);
            
            foreach ($workflow->getTransitions() as $transition) {
                if (in_array($current, $transition->getFrom(), true)) {
                    foreach ($transition->getTo() as $toPlace) {
                        if (in_array($toPlace, $visited, true)) {
                            $analysis['hasCycles'] = true;
                        } else {
                            $visited[] = $toPlace;
                            $queue[] = $toPlace;
                        }
                    }
                }
            }
        }

        $analysis['reachable'] = $visited;

        // Find unreachable places
        $allPlaces = array_map(fn(Place $p) => $p->getName(), $workflow->getPlaces());
        $analysis['unreachable'] = array_diff($allPlaces, $visited);

        // Find dead ends (no outgoing transitions)
        foreach ($allPlaces as $placeName) {
            $hasOutgoing = false;
            foreach ($workflow->getTransitions() as $transition) {
                if (in_array($placeName, $transition->getFrom(), true)) {
                    $hasOutgoing = true;
                    break;
                }
            }
            if (!$hasOutgoing) {
                $analysis['deadEnds'][] = $placeName;
            }
        }

        return $analysis;
    }
}

