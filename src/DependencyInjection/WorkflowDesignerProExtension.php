<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\Extension;
use Symfony\Component\DependencyInjection\Loader\YamlFileLoader;

class WorkflowDesignerProExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        // Set configuration parameters
        $container->setParameter('workflow_designer_pro.storage_path', $config['storage_path']);
        $container->setParameter('workflow_designer_pro.publish_path', $config['publish_path']);
        $container->setParameter('workflow_designer_pro.backup_enabled', $config['backup_enabled']);
        $container->setParameter('workflow_designer_pro.max_versions', $config['max_versions']);
        $container->setParameter('workflow_designer_pro.auto_cache_clear', $config['auto_cache_clear']);

        // Load services
        $loader = new YamlFileLoader($container, new FileLocator(__DIR__ . '/../Resources/config'));
        $loader->load('services.yaml');
    }
}

