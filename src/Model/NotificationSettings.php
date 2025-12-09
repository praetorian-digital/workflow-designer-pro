<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\Model;

/**
 * NotificationSettings model for workflow transition notifications.
 */
class NotificationSettings implements \JsonSerializable
{
    private array $notifyUsers = [];
    private array $notifyRoles = [];
    private array $channelTypes = ['mail']; // mail, pimcore_notification
    private ?string $mailType = 'template'; // template, document
    private ?string $mailPath = null;

    // Getters
    public function getNotifyUsers(): array
    {
        return $this->notifyUsers;
    }

    public function getNotifyRoles(): array
    {
        return $this->notifyRoles;
    }

    public function getChannelTypes(): array
    {
        return $this->channelTypes;
    }

    public function getMailType(): ?string
    {
        return $this->mailType;
    }

    public function getMailPath(): ?string
    {
        return $this->mailPath;
    }

    // Setters
    public function setNotifyUsers(array $notifyUsers): self
    {
        $this->notifyUsers = $notifyUsers;
        return $this;
    }

    public function setNotifyRoles(array $notifyRoles): self
    {
        $this->notifyRoles = $notifyRoles;
        return $this;
    }

    public function setChannelTypes(array $channelTypes): self
    {
        $this->channelTypes = $channelTypes;
        return $this;
    }

    public function setMailType(?string $mailType): self
    {
        $this->mailType = $mailType;
        return $this;
    }

    public function setMailPath(?string $mailPath): self
    {
        $this->mailPath = $mailPath;
        return $this;
    }

    public function jsonSerialize(): array
    {
        return [
            'notifyUsers' => $this->notifyUsers,
            'notifyRoles' => $this->notifyRoles,
            'channelTypes' => $this->channelTypes,
            'mailType' => $this->mailType,
            'mailPath' => $this->mailPath,
        ];
    }

    public static function fromArray(array $data): self
    {
        $settings = new self();
        
        if (isset($data['notifyUsers'])) {
            $settings->setNotifyUsers((array) $data['notifyUsers']);
        }
        if (isset($data['notifyRoles'])) {
            $settings->setNotifyRoles((array) $data['notifyRoles']);
        }
        if (isset($data['channelTypes'])) {
            $settings->setChannelTypes((array) $data['channelTypes']);
        }
        if (isset($data['mailType'])) {
            $settings->setMailType($data['mailType']);
        }
        if (isset($data['mailPath'])) {
            $settings->setMailPath($data['mailPath']);
        }

        return $settings;
    }
}

