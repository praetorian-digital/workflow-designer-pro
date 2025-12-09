<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * GlobalAction model representing Pimcore workflow global actions.
 */
class GlobalAction implements \JsonSerializable
{
    private string $name;
    private ?string $label = null;
    private ?string $iconClass = null;
    private ?string $objectLayout = null;
    private array $guard = [];
    private array $to = [];
    private array $notes = [];
    private array $notificationSettings = [];

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

    public function getGuard(): array
    {
        return $this->guard;
    }

    public function getTo(): array
    {
        return $this->to;
    }

    public function getNotes(): array
    {
        return $this->notes;
    }

    public function getNotificationSettings(): array
    {
        return $this->notificationSettings;
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

    public function setGuard(array $guard): self
    {
        $this->guard = $guard;
        return $this;
    }

    public function setTo(array $to): self
    {
        $this->to = $to;
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

    public function jsonSerialize(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'iconClass' => $this->iconClass,
            'objectLayout' => $this->objectLayout,
            'guard' => $this->guard,
            'to' => $this->to,
            'notes' => $this->notes,
            'notificationSettings' => $this->notificationSettings,
        ];
    }

    public static function fromArray(array $data): self
    {
        $action = new self($data['name']);
        
        if (isset($data['label'])) {
            $action->setLabel($data['label']);
        }
        if (isset($data['iconClass'])) {
            $action->setIconClass($data['iconClass']);
        }
        if (isset($data['objectLayout'])) {
            $action->setObjectLayout($data['objectLayout']);
        }
        if (isset($data['guard'])) {
            $action->setGuard($data['guard']);
        }
        if (isset($data['to'])) {
            $action->setTo((array) $data['to']);
        }
        if (isset($data['notes'])) {
            $action->setNotes($data['notes']);
        }
        if (isset($data['notificationSettings'])) {
            $action->setNotificationSettings($data['notificationSettings']);
        }

        return $action;
    }
}

