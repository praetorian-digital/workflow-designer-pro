<?php

declare(strict_types=1);

namespace PraetorianDigital\WorkflowDesignerProBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('workflow_designer_pro');

        $treeBuilder->getRootNode()
            ->children()
                ->scalarNode('storage_path')
                    ->defaultValue('%kernel.project_dir%/var/config/workflow_designer_pro')
                    ->info('Path where workflow drafts and versions are stored')
                ->end()
                ->scalarNode('publish_path')
                    ->defaultValue('%kernel.project_dir%/config/workflows')
                    ->info('Path where published workflow YAML files are written')
                ->end()
                ->booleanNode('backup_enabled')
                    ->defaultTrue()
                    ->info('Whether to create backups before publishing')
                ->end()
                ->integerNode('max_versions')
                    ->defaultValue(20)
                    ->min(1)
                    ->max(100)
                    ->info('Maximum number of versions to keep per workflow')
                ->end()
                ->booleanNode('auto_cache_clear')
                    ->defaultTrue()
                    ->info('Automatically clear cache after publishing workflows')
                ->end()
            ->end();

        return $treeBuilder;
    }
}

