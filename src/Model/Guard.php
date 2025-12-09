<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * Guard model representing transition guards in Pimcore workflows.
 */
class Guard implements \JsonSerializable
{
    private ?string $expression = null;
    private array $roles = [];
    private array $permissions = [];
    private ?string $service = null;

    // Getters
    public function getExpression(): ?string
    {
        return $this->expression;
    }

    public function getRoles(): array
    {
        return $this->roles;
    }

    public function getPermissions(): array
    {
        return $this->permissions;
    }

    public function getService(): ?string
    {
        return $this->service;
    }

    // Setters
    public function setExpression(?string $expression): self
    {
        $this->expression = $expression;
        return $this;
    }

    public function setRoles(array $roles): self
    {
        $this->roles = $roles;
        return $this;
    }

    public function setPermissions(array $permissions): self
    {
        $this->permissions = $permissions;
        return $this;
    }

    public function setService(?string $service): self
    {
        $this->service = $service;
        return $this;
    }

    public function isEmpty(): bool
    {
        return empty($this->expression) 
            && empty($this->roles) 
            && empty($this->permissions) 
            && empty($this->service);
    }

    public function jsonSerialize(): array
    {
        return [
            'expression' => $this->expression,
            'roles' => $this->roles,
            'permissions' => $this->permissions,
            'service' => $this->service,
        ];
    }

    public static function fromArray(array $data): self
    {
        $guard = new self();
        
        if (isset($data['expression'])) {
            $guard->setExpression($data['expression']);
        }
        if (isset($data['roles'])) {
            $guard->setRoles((array) $data['roles']);
        }
        if (isset($data['permissions'])) {
            $guard->setPermissions((array) $data['permissions']);
        }
        if (isset($data['service'])) {
            $guard->setService($data['service']);
        }

        return $guard;
    }
}

