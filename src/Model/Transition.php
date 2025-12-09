<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * Transition model representing a workflow transition.
 */
class Transition implements \JsonSerializable
{
    private string $name;
    private ?string $label = null;
    private ?string $iconClass = null;
    private ?string $objectLayout = null;
    private array $from = [];
    private array $to = [];
    private string|array|null $guard = null;
    private array $options = [];
    private array $notes = [];
    private array $notificationSettings = [];
    private ?string $changePublicationState = null;
    private array $metadata = [];

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    // Getters
    public function getName(): string
    {
        return $this->name;
    }

    public function getLabel(): ?string
    {
        return $this->label;
    }

    public function getIconClass(): ?string
    {
        return $this->iconClass;
    }

    public function getObjectLayout(): ?string
    {
        return $this->objectLayout;
    }

    public function getFrom(): array
    {
        return $this->from;
    }

    public function getTo(): array
    {
        return $this->to;
    }

    public function getGuard(): string|array|null
    {
        return $this->guard;
    }

    public function getOptions(): array
    {
        return $this->options;
    }

    public function getNotes(): array
    {
        return $this->notes;
    }

    public function getNotificationSettings(): array
    {
        return $this->notificationSettings;
    }

    public function getChangePublicationState(): ?string
    {
        return $this->changePublicationState;
    }

    public function getMetadata(): array
    {
        return $this->metadata;
    }

    // Setters
    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function setLabel(?string $label): self
    {
        $this->label = $label;
        return $this;
    }

    public function setIconClass(?string $iconClass): self
    {
        $this->iconClass = $iconClass;
        return $this;
    }

    public function setObjectLayout(?string $objectLayout): self
    {
        $this->objectLayout = $objectLayout;
        return $this;
    }

    public function setFrom(array $from): self
    {
        $this->from = $from;
        return $this;
    }

    public function setTo(array $to): self
    {
        $this->to = $to;
        return $this;
    }

    public function setGuard(string|array|null $guard): self
    {
        $this->guard = $guard;
        return $this;
    }

    public function setOptions(array $options): self
    {
        $this->options = $options;
        return $this;
    }

    public function setNotes(array $notes): self
    {
        $this->notes = $notes;
        return $this;
    }

    public function setNotificationSettings(array $notificationSettings): self
    {
        $this->notificationSettings = $notificationSettings;
        return $this;
    }

    public function setChangePublicationState(?string $changePublicationState): self
    {
        $this->changePublicationState = $changePublicationState;
        return $this;
    }

    public function setMetadata(array $metadata): self
    {
        $this->metadata = $metadata;
        return $this;
    }

    public function jsonSerialize(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'iconClass' => $this->iconClass,
            'objectLayout' => $this->objectLayout,
            'from' => $this->from,
            'to' => $this->to,
            'guard' => $this->guard,
            'options' => $this->options,
            'notes' => $this->notes,
            'notificationSettings' => $this->notificationSettings,
            'changePublicationState' => $this->changePublicationState,
            'metadata' => $this->metadata,
        ];
    }

    public static function fromArray(array $data): self
    {
        $transition = new self($data['name']);
        
        if (isset($data['label'])) {
            $transition->setLabel($data['label']);
        }
        if (isset($data['iconClass'])) {
            $transition->setIconClass($data['iconClass']);
        }
        if (isset($data['objectLayout'])) {
            $transition->setObjectLayout($data['objectLayout']);
        }
        if (isset($data['from'])) {
            $transition->setFrom((array) $data['from']);
        }
        if (isset($data['to'])) {
            $transition->setTo((array) $data['to']);
        }
        if (isset($data['guard'])) {
            $transition->setGuard($data['guard']);
        }
        if (isset($data['options'])) {
            $transition->setOptions($data['options']);
        }
        if (isset($data['notes'])) {
            $transition->setNotes($data['notes']);
        }
        if (isset($data['notificationSettings'])) {
            $transition->setNotificationSettings($data['notificationSettings']);
        }
        if (isset($data['changePublicationState'])) {
            $transition->setChangePublicationState($data['changePublicationState']);
        }
        if (isset($data['metadata'])) {
            $transition->setMetadata($data['metadata']);
        }

        return $transition;
    }
}

