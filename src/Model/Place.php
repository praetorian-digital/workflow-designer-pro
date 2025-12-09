<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * Place model representing a workflow place/state.
 */
class Place implements \JsonSerializable
{
    private string $name;
    private ?string $label = null;
    private ?string $title = null;
    private ?string $color = null;
    private bool $colorInverted = false;
    private bool $visibleInHeader = true;
    private array $permissions = [];
    private array $metadata = [];
    
    // Visual properties for graph editor
    private ?float $positionX = null;
    private ?float $positionY = null;

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

    public function getTitle(): ?string
    {
        return $this->title;
    }

    public function getColor(): ?string
    {
        return $this->color;
    }

    public function isColorInverted(): bool
    {
        return $this->colorInverted;
    }

    public function isVisibleInHeader(): bool
    {
        return $this->visibleInHeader;
    }

    public function getPermissions(): array
    {
        return $this->permissions;
    }

    public function getMetadata(): array
    {
        return $this->metadata;
    }

    public function getPositionX(): ?float
    {
        return $this->positionX;
    }

    public function getPositionY(): ?float
    {
        return $this->positionY;
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

    public function setTitle(?string $title): self
    {
        $this->title = $title;
        return $this;
    }

    public function setColor(?string $color): self
    {
        $this->color = $color;
        return $this;
    }

    public function setColorInverted(bool $colorInverted): self
    {
        $this->colorInverted = $colorInverted;
        return $this;
    }

    public function setVisibleInHeader(bool $visibleInHeader): self
    {
        $this->visibleInHeader = $visibleInHeader;
        return $this;
    }

    public function setPermissions(array $permissions): self
    {
        $this->permissions = $permissions;
        return $this;
    }

    public function setMetadata(array $metadata): self
    {
        $this->metadata = $metadata;
        return $this;
    }

    public function setPositionX(?float $positionX): self
    {
        $this->positionX = $positionX;
        return $this;
    }

    public function setPositionY(?float $positionY): self
    {
        $this->positionY = $positionY;
        return $this;
    }

    public function jsonSerialize(): array
    {
        return [
            'name' => $this->name,
            'label' => $this->label,
            'title' => $this->title,
            'color' => $this->color,
            'colorInverted' => $this->colorInverted,
            'visibleInHeader' => $this->visibleInHeader,
            'permissions' => $this->permissions,
            'metadata' => $this->metadata,
            'positionX' => $this->positionX,
            'positionY' => $this->positionY,
        ];
    }

    public static function fromArray(array $data): self
    {
        $place = new self($data['name']);
        
        if (isset($data['label'])) {
            $place->setLabel($data['label']);
        }
        if (isset($data['title'])) {
            $place->setTitle($data['title']);
        }
        if (isset($data['color'])) {
            $place->setColor($data['color']);
        }
        if (isset($data['colorInverted'])) {
            $place->setColorInverted(filter_var($data['colorInverted'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($data['visibleInHeader'])) {
            $place->setVisibleInHeader(filter_var($data['visibleInHeader'], FILTER_VALIDATE_BOOLEAN));
        }
        if (isset($data['permissions'])) {
            $place->setPermissions($data['permissions']);
        }
        if (isset($data['metadata'])) {
            $place->setMetadata($data['metadata']);
        }
        if (isset($data['positionX'])) {
            $place->setPositionX($data['positionX']);
        }
        if (isset($data['positionY'])) {
            $place->setPositionY($data['positionY']);
        }

        return $place;
    }
}

