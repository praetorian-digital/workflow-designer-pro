<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Service;

use PraetorianDigital\WorkflowDesignerProBundle\Model\Workflow;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Place;
use PraetorianDigital\WorkflowDesignerProBundle\Model\Transition;

/**
 * Service for validating workflow definitions.
 */
class WorkflowValidationService
{
    /**
     * Validate a workflow definition.
     *
     * @return array<string, array{type: string, message: string, field?: string}>
     */
    public function validate(Workflow $workflow): array
    {
        $errors = [];

        // Basic validation
        $errors = array_merge($errors, $this->validateBasicProperties($workflow));
        
        // Places validation
        $errors = array_merge($errors, $this->validatePlaces($workflow));
        
        // Transitions validation
        $errors = array_merge($errors, $this->validateTransitions($workflow));
        
        // Structural validation
        $errors = array_merge($errors, $this->validateStructure($workflow));
        
        // Guard validation
        $errors = array_merge($errors, $this->validateGuards($workflow));

        return $errors;
    }

    private function validateBasicProperties(Workflow $workflow): array
    {
        $errors = [];

        if (empty($workflow->getName())) {
            $errors[] = [
                'type' => 'error',
                'message' => 'Workflow name is required',
                'field' => 'name',
            ];
        } elseif (!preg_match('/^[a-z][a-z0-9_]*$/', $workflow->getName())) {
            $errors[] = [
                'type' => 'error',
                'message' => 'Workflow name must be lowercase, start with a letter, and contain only letters, numbers, and underscores',
                'field' => 'name',
            ];
        }

        // Validate support strategy based on type
        $errors = array_merge($errors, $this->validateSupportStrategy($workflow));

        if (empty($workflow->getInitialMarking())) {
            $errors[] = [
                'type' => 'error',
                'message' => 'Initial marking (initial place) is required',
                'field' => 'initialMarking',
            ];
        }

        return $errors;
    }

    /**
     * Validate support strategy configuration based on the selected type.
     * 
     * - Simple: requires at least one supported class
     * - Expression: requires at least one supported class AND an expression
     * - Custom: requires a service class (supports list is optional)
     */
    private function validateSupportStrategy(Workflow $workflow): array
    {
        $errors = [];
        $strategyType = $workflow->getSupportStrategyType();
        $supports = $workflow->getSupports();

        switch ($strategyType) {
            case Workflow::SUPPORT_STRATEGY_SIMPLE:
                // Simple strategy requires at least one supported class
                if (empty($supports)) {
                    $errors[] = [
                        'type' => 'error',
                        'message' => 'At least one supported class must be specified for Simple strategy',
                        'field' => 'supports',
                    ];
                }
                break;

            case Workflow::SUPPORT_STRATEGY_EXPRESSION:
                // Expression strategy requires a class AND an expression
                if (empty($supports)) {
                    $errors[] = [
                        'type' => 'error',
                        'message' => 'A target class must be specified for Expression strategy',
                        'field' => 'supports',
                    ];
                }
                
                $expression = $workflow->getSupportStrategyExpression();
                if (empty($expression)) {
                    $errors[] = [
                        'type' => 'error',
                        'message' => 'An expression must be specified for Expression strategy',
                        'field' => 'supportStrategy.expression',
                    ];
                } else {
                    // Basic expression validation
                    if (substr_count($expression, '(') !== substr_count($expression, ')')) {
                        $errors[] = [
                            'type' => 'error',
                            'message' => 'Support strategy expression has unbalanced parentheses',
                            'field' => 'supportStrategy.expression',
                        ];
                    }
                    // Check for common expression patterns
                    if (!preg_match('/subject\.|is_granted|true|false/', $expression)) {
                        $errors[] = [
                            'type' => 'warning',
                            'message' => 'Expression should typically reference "subject" (e.g., subject.getXxx()) or use is_granted()',
                            'field' => 'supportStrategy.expression',
                        ];
                    }
                }
                break;

            case Workflow::SUPPORT_STRATEGY_CUSTOM:
                // Custom strategy requires a service class
                $service = $workflow->getSupportStrategyService();
                if (empty($service)) {
                    $errors[] = [
                        'type' => 'error',
                        'message' => 'A service class must be specified for Custom strategy',
                        'field' => 'supportStrategy.service',
                    ];
                } else {
                    // Validate class name format
                    if (!preg_match('/^[A-Z][a-zA-Z0-9_\\\\]*$/', $service)) {
                        $errors[] = [
                            'type' => 'warning',
                            'message' => 'Service class name should be a valid fully qualified class name (e.g., App\\Workflow\\MyStrategy)',
                            'field' => 'supportStrategy.service',
                        ];
                    }
                }
                break;

            default:
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Invalid support strategy type: %s', $strategyType),
                    'field' => 'supportStrategy.type',
                ];
        }

        return $errors;
    }

    private function validatePlaces(Workflow $workflow): array
    {
        $errors = [];
        $places = $workflow->getPlaces();

        if (empty($places)) {
            $errors[] = [
                'type' => 'error',
                'message' => 'At least one place must be defined',
                'field' => 'places',
            ];
            return $errors;
        }

        $placeNames = [];
        foreach ($places as $place) {
            $name = $place->getName();
            
            if (empty($name)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => 'Place name cannot be empty',
                    'field' => 'places',
                ];
                continue;
            }

            if (!preg_match('/^[a-z][a-z0-9_]*$/', $name)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Place name "%s" must be lowercase, start with a letter, and contain only letters, numbers, and underscores', $name),
                    'field' => 'places.' . $name,
                ];
            }

            if (in_array($name, $placeNames, true)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Duplicate place name: %s', $name),
                    'field' => 'places.' . $name,
                ];
            }

            $placeNames[] = $name;
        }

        // Check if initial marking exists in places
        $initialMarking = $workflow->getInitialMarking();
        if ($initialMarking && !in_array($initialMarking, $placeNames, true)) {
            $errors[] = [
                'type' => 'error',
                'message' => sprintf('Initial marking "%s" does not exist in places', $initialMarking),
                'field' => 'initialMarking',
            ];
        }

        return $errors;
    }

    private function validateTransitions(Workflow $workflow): array
    {
        $errors = [];
        $transitions = $workflow->getTransitions();
        $placeNames = array_map(fn(Place $p) => $p->getName(), $workflow->getPlaces());

        if (empty($transitions)) {
            $errors[] = [
                'type' => 'warning',
                'message' => 'No transitions defined - workflow will have no state changes',
                'field' => 'transitions',
            ];
            return $errors;
        }

        $transitionNames = [];
        foreach ($transitions as $transition) {
            $name = $transition->getName();
            
            if (empty($name)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => 'Transition name cannot be empty',
                    'field' => 'transitions',
                ];
                continue;
            }

            if (!preg_match('/^[a-z][a-z0-9_]*$/', $name)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Transition name "%s" must be lowercase, start with a letter, and contain only letters, numbers, and underscores', $name),
                    'field' => 'transitions.' . $name,
                ];
            }

            if (in_array($name, $transitionNames, true)) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Duplicate transition name: %s', $name),
                    'field' => 'transitions.' . $name,
                ];
            }

            $transitionNames[] = $name;

            // Validate from places
            if (empty($transition->getFrom())) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Transition "%s" must have at least one "from" place', $name),
                    'field' => 'transitions.' . $name . '.from',
                ];
            } else {
                foreach ($transition->getFrom() as $fromPlace) {
                    if (!in_array($fromPlace, $placeNames, true)) {
                        $errors[] = [
                            'type' => 'error',
                            'message' => sprintf('Transition "%s" references unknown "from" place: %s', $name, $fromPlace),
                            'field' => 'transitions.' . $name . '.from',
                        ];
                    }
                }
            }

            // Validate to places
            if (empty($transition->getTo())) {
                $errors[] = [
                    'type' => 'error',
                    'message' => sprintf('Transition "%s" must have at least one "to" place', $name),
                    'field' => 'transitions.' . $name . '.to',
                ];
            } else {
                foreach ($transition->getTo() as $toPlace) {
                    if (!in_array($toPlace, $placeNames, true)) {
                        $errors[] = [
                            'type' => 'error',
                            'message' => sprintf('Transition "%s" references unknown "to" place: %s', $name, $toPlace),
                            'field' => 'transitions.' . $name . '.to',
                        ];
                    }
                }
            }
        }

        return $errors;
    }

    private function validateStructure(Workflow $workflow): array
    {
        $errors = [];
        $places = $workflow->getPlaces();
        $transitions = $workflow->getTransitions();
        $placeNames = array_map(fn(Place $p) => $p->getName(), $places);

        // Find orphan places (not reachable from initial marking)
        $reachable = $this->findReachablePlaces($workflow);
        foreach ($placeNames as $placeName) {
            if (!in_array($placeName, $reachable, true)) {
                $errors[] = [
                    'type' => 'warning',
                    'message' => sprintf('Place "%s" is not reachable from initial marking', $placeName),
                    'field' => 'places.' . $placeName,
                ];
            }
        }

        // Find dead-end places (no outgoing transitions except final states)
        $hasOutgoing = [];
        foreach ($transitions as $transition) {
            foreach ($transition->getFrom() as $from) {
                $hasOutgoing[$from] = true;
            }
        }

        foreach ($placeNames as $placeName) {
            if (!isset($hasOutgoing[$placeName])) {
                // Only warn if it's not a typical "final" state name
                if (!preg_match('/(final|completed|done|finished|closed|end)/', $placeName)) {
                    $errors[] = [
                        'type' => 'info',
                        'message' => sprintf('Place "%s" has no outgoing transitions (final state)', $placeName),
                        'field' => 'places.' . $placeName,
                    ];
                }
            }
        }

        return $errors;
    }

    private function validateGuards(Workflow $workflow): array
    {
        $errors = [];
        $transitions = $workflow->getTransitions();

        foreach ($transitions as $transition) {
            $guard = $transition->getGuard();
            
            if (empty($guard)) {
                continue;
            }

            // Validate expression syntax (basic check)
            if (isset($guard['expression']) && !empty($guard['expression'])) {
                $expression = $guard['expression'];
                // Check for balanced parentheses
                if (substr_count($expression, '(') !== substr_count($expression, ')')) {
                    $errors[] = [
                        'type' => 'error',
                        'message' => sprintf('Guard expression in transition "%s" has unbalanced parentheses', $transition->getName()),
                        'field' => 'transitions.' . $transition->getName() . '.guard.expression',
                    ];
                }
            }

            // Warn about empty roles/permissions arrays
            if (isset($guard['roles']) && is_array($guard['roles']) && empty($guard['roles'])) {
                $errors[] = [
                    'type' => 'warning',
                    'message' => sprintf('Guard in transition "%s" has empty roles array', $transition->getName()),
                    'field' => 'transitions.' . $transition->getName() . '.guard.roles',
                ];
            }
        }

        return $errors;
    }

    /**
     * Find all places reachable from the initial marking.
     */
    private function findReachablePlaces(Workflow $workflow): array
    {
        $initialMarking = $workflow->getInitialMarking();
        if (!$initialMarking) {
            return [];
        }

        $transitions = $workflow->getTransitions();
        $reachable = [$initialMarking];
        $toProcess = [$initialMarking];

        while (!empty($toProcess)) {
            $current = array_shift($toProcess);
            
            foreach ($transitions as $transition) {
                if (in_array($current, $transition->getFrom(), true)) {
                    foreach ($transition->getTo() as $to) {
                        if (!in_array($to, $reachable, true)) {
                            $reachable[] = $to;
                            $toProcess[] = $to;
                        }
                    }
                }
            }
        }

        return $reachable;
    }

    /**
     * Check if a workflow has any errors (not just warnings).
     */
    public function hasErrors(array $validationResults): bool
    {
        foreach ($validationResults as $result) {
            if ($result['type'] === 'error') {
                return true;
            }
        }
        return false;
    }

    /**
     * Filter validation results by type.
     */
    public function filterByType(array $validationResults, string $type): array
    {
        return array_filter($validationResults, fn($r) => $r['type'] === $type);
    }
}

