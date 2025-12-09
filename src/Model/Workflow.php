<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * Workflow model representing a complete workflow definition.
 */
class Workflow implements \JsonSerializable
{
    public const SUPPORT_STRATEGY_SIMPLE = 'simple';
    public const SUPPORT_STRATEGY_EXPRESSION = 'expression';
    public const SUPPORT_STRATEGY_CUSTOM = 'custom';

    private string $id;
    private string $name;
    private ?string $label = null;
    private string $type = 'workflow'; // 'workflow' or 'state_machine'
    private array $supports = [];
    private string $supportStrategyType = self::SUPPORT_STRATEGY_SIMPLE; // 'simple', 'expression', 'custom'
    private ?string $supportStrategyExpression = null; // Expression for expression strategy
    private ?string $supportStrategyService = null; // Service class for custom strategy
    private ?string $initialMarking = null;
    private array $places = [];
    private array $transitions = [];
    private array $globalActions = [];
    private array $metadata = [];
    private ?string $markingStoreType = 'state_table';
    private ?string $markingStoreProperty = null;
    private array $markingStoreArguments = [];
    private bool $auditTrailEnabled = false;
    private ?\DateTimeImmutable $createdAt = null;
    private ?\DateTimeImmutable $updatedAt = null;
    private ?int $version = null;
    private string $status = 'draft'; // 'draft', 'published'

    public function __construct(string $name)
    {
        $this->id = $this->generateId();
        $this->name = $name;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    private function generateId(): string
    {
        $data = random_bytes(16);
        $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
        $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }

    // Getters
    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function getType(): string
    {
        return $this->type;
    }

    public function getSupports(): array
    {
        return $this->supports;
    }

    public function getSupportStrategyType(): string
    {
        return $this->supportStrategyType;
    }

    public function getSupportStrategyExpression(): ?string
    {
        return $this->supportStrategyExpression;
    }

    public function getSupportStrategyService(): ?string
    {
        return $this->supportStrategyService;
    }

    public function getInitialMarking(): ?string
    {
        return $this->initialMarking;
    }

    /**
     * @return Place[]
     */
    public function getPlaces(): array
    {
        return $this->places;
    }

    /**
     * @return Transition[]
     */
    public function getTransitions(): array
    {
        return $this->transitions;
    }

    public function getGlobalActions(): array
    {
        return $this->globalActions;
    }

    public function getMetadata(): array
    {
        return $this->metadata;
    }

    public function getMarkingStoreType(): ?string
    {
        return $this->markingStoreType;
    }

    public function getMarkingStoreProperty(): ?string
    {
        return $this->markingStoreProperty;
    }

    public function getMarkingStoreArguments(): array
    {
        return $this->markingStoreArguments;
    }

    public function isAuditTrailEnabled(): bool
    {
        return $this->auditTrailEnabled;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function getVersion(): ?int
    {
        return $this->version;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    // Setters
    public function setId(string $id): self
    {
        $this->id = $id;
        return $this;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        $this->markUpdated();
        return $this;
    }

    public function setLabel(?string $label): self
    {
        $this->label = $label;
        $this->markUpdated();
        return $this;
    }

    public function setType(string $type): self
    {
        if (!in_array($type, ['workflow', 'state_machine'], true)) {
            throw new \InvalidArgumentException('Type must be "workflow" or "state_machine"');
        }
        $this->type = $type;
        $this->markUpdated();
        return $this;
    }

    public function setSupports(array $supports): self
    {
        $this->supports = $supports;
        $this->markUpdated();
        return $this;
    }

    public function setSupportStrategyType(string $supportStrategyType): self
    {
        if (!in_array($supportStrategyType, [self::SUPPORT_STRATEGY_SIMPLE, self::SUPPORT_STRATEGY_EXPRESSION, self::SUPPORT_STRATEGY_CUSTOM], true)) {
            throw new \InvalidArgumentException('Support strategy type must be "simple", "expression", or "custom"');
        }
        $this->supportStrategyType = $supportStrategyType;
        $this->markUpdated();
        return $this;
    }

    public function setSupportStrategyExpression(?string $supportStrategyExpression): self
    {
        $this->supportStrategyExpression = $supportStrategyExpression;
        $this->markUpdated();
        return $this;
    }

    public function setSupportStrategyService(?string $supportStrategyService): self
    {
        $this->supportStrategyService = $supportStrategyService;
        $this->markUpdated();
        return $this;
    }

    public function setInitialMarking(?string $initialMarking): self
    {
        $this->initialMarking = $initialMarking;
        $this->markUpdated();
        return $this;
    }

    public function setPlaces(array $places): self
    {
        $this->places = $places;
        $this->markUpdated();
        return $this;
    }

    public function addPlace(Place $place): self
    {
        $this->places[$place->getName()] = $place;
        $this->markUpdated();
        return $this;
    }

    public function removePlace(string $placeName): self
    {
        unset($this->places[$placeName]);
        $this->markUpdated();
        return $this;
    }

    public function setTransitions(array $transitions): self
    {
        $this->transitions = $transitions;
        $this->markUpdated();
        return $this;
    }

    public function addTransition(Transition $transition): self
    {
        $this->transitions[$transition->getName()] = $transition;
        $this->markUpdated();
        return $this;
    }

    public function removeTransition(string $transitionName): self
    {
        unset($this->transitions[$transitionName]);
        $this->markUpdated();
        return $this;
    }

    public function setGlobalActions(array $globalActions): self
    {
        $this->globalActions = $globalActions;
        $this->markUpdated();
        return $this;
    }

    public function setMetadata(array $metadata): self
    {
        $this->metadata = $metadata;
        $this->markUpdated();
        return $this;
    }

    public function setMarkingStoreType(?string $markingStoreType): self
    {
        $this->markingStoreType = $markingStoreType;
        $this->markUpdated();
        return $this;
    }

    public function setMarkingStoreProperty(?string $markingStoreProperty): self
    {
        $this->markingStoreProperty = $markingStoreProperty;
        $this->markUpdated();
        return $this;
    }

    public function setMarkingStoreArguments(array $markingStoreArguments): self
    {
        $this->markingStoreArguments = $markingStoreArguments;
        $this->markUpdated();
        return $this;
    }

    public function setAuditTrailEnabled(bool $auditTrailEnabled): self
    {
        $this->auditTrailEnabled = $auditTrailEnabled;
        $this->markUpdated();
        return $this;
    }

    public function setCreatedAt(?\DateTimeImmutable $createdAt): self
    {
        $this->createdAt = $createdAt;
        return $this;
    }

    public function setUpdatedAt(?\DateTimeImmutable $updatedAt): self
    {
        $this->updatedAt = $updatedAt;
        return $this;
    }

    public function setVersion(?int $version): self
    {
        $this->version = $version;
        return $this;
    }

    public function setStatus(string $status): self
    {
        if (!in_array($status, ['draft', 'published'], true)) {
            throw new \InvalidArgumentException('Status must be "draft" or "published"');
        }
        $this->status = $status;
        $this->markUpdated();
        return $this;
    }

    private function markUpdated(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'label' => $this->label,
            'type' => $this->type,
            'supports' => $this->supports,
            'supportStrategy' => [
                'type' => $this->supportStrategyType,
                'expression' => $this->supportStrategyExpression,
                'service' => $this->supportStrategyService,
            ],
            'initialMarking' => $this->initialMarking,
            'places' => array_map(fn(Place $p) => $p->jsonSerialize(), $this->places),
            'transitions' => array_map(fn(Transition $t) => $t->jsonSerialize(), $this->transitions),
            'globalActions' => $this->globalActions,
            'metadata' => $this->metadata,
            'markingStore' => [
                'type' => $this->markingStoreType,
                'property' => $this->markingStoreProperty,
                'arguments' => $this->markingStoreArguments,
            ],
            'auditTrailEnabled' => $this->auditTrailEnabled,
            'createdAt' => $this->createdAt?->format('c'),
            'updatedAt' => $this->updatedAt?->format('c'),
            'version' => $this->version,
            'status' => $this->status,
        ];
    }

    public static function fromArray(array $data): self
    {
        $workflow = new self($data['name'] ?? 'Unnamed Workflow');
        
        if (isset($data['id'])) {
            $workflow->setId($data['id']);
        }
        if (isset($data['label'])) {
            $workflow->setLabel($data['label']);
        }
        if (isset($data['type'])) {
            $workflow->setType($data['type']);
        }
        if (isset($data['supports'])) {
            $workflow->setSupports($data['supports']);
        }
        // Handle support strategy - can be array (new format) or string (legacy format)
        if (isset($data['supportStrategy'])) {
            if (is_array($data['supportStrategy'])) {
                if (isset($data['supportStrategy']['type'])) {
                    $workflow->setSupportStrategyType($data['supportStrategy']['type']);
                }
                if (isset($data['supportStrategy']['expression'])) {
                    $workflow->setSupportStrategyExpression($data['supportStrategy']['expression']);
                }
                if (isset($data['supportStrategy']['service'])) {
                    $workflow->setSupportStrategyService($data['supportStrategy']['service']);
                }
            } elseif (is_string($data['supportStrategy'])) {
                // Legacy format: supportStrategy was just a service name
                $workflow->setSupportStrategyType(self::SUPPORT_STRATEGY_CUSTOM);
                $workflow->setSupportStrategyService($data['supportStrategy']);
            }
        }
        if (isset($data['initialMarking'])) {
            $workflow->setInitialMarking($data['initialMarking']);
        }
        if (isset($data['places'])) {
            $places = [];
            foreach ($data['places'] as $placeData) {
                $place = Place::fromArray($placeData);
                $places[$place->getName()] = $place;
            }
            $workflow->setPlaces($places);
        }
        if (isset($data['transitions'])) {
            $transitions = [];
            foreach ($data['transitions'] as $transitionData) {
                $transition = Transition::fromArray($transitionData);
                $transitions[$transition->getName()] = $transition;
            }
            $workflow->setTransitions($transitions);
        }
        if (isset($data['globalActions'])) {
            $workflow->setGlobalActions($data['globalActions']);
        }
        if (isset($data['metadata'])) {
            $workflow->setMetadata($data['metadata']);
        }
        if (isset($data['markingStore'])) {
            $workflow->setMarkingStoreType($data['markingStore']['type'] ?? 'method');
            $workflow->setMarkingStoreProperty($data['markingStore']['property'] ?? 'state');
            $workflow->setMarkingStoreArguments($data['markingStore']['arguments'] ?? []);
        }
        if (isset($data['auditTrailEnabled'])) {
            $workflow->setAuditTrailEnabled(filter_var($data['auditTrailEnabled'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($data['createdAt'])) {
            $workflow->setCreatedAt(new \DateTimeImmutable($data['createdAt']));
        }
        if (isset($data['updatedAt'])) {
            $workflow->setUpdatedAt(new \DateTimeImmutable($data['updatedAt']));
        }
        if (isset($data['version'])) {
            $workflow->setVersion($data['version']);
        }
        if (isset($data['status'])) {
            $workflow->setStatus($data['status']);
        }

        return $workflow;
    }
}

