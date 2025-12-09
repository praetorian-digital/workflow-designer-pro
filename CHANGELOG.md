# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-12-09

### Added
- **Support Strategy Configuration** - Choose how workflows apply to objects:
  - Simple strategy: Select classes from a list (existing behavior)
  - Expression strategy: Use Symfony expressions with object conditions
  - Custom service strategy: Implement WorkflowSupportStrategyInterface
- **Expression Templates** - 10 pre-built expression templates for common use cases
- **Expression Autocomplete** - Help panel with available methods, operators, and syntax
- **Auto-detection of Strategy Services** - Automatically finds services implementing WorkflowSupportStrategyInterface
- **Strategy-specific Validation** - Validation rules adapted to each support strategy type

### Changed
- Workflow properties panel redesigned to accommodate support strategy configuration
- Validation no longer requires class list when using Custom service strategy
- Config endpoint now includes support strategy services and expression templates

## [1.0.0] - 2025-12-09

### Added
- Initial release
- Visual graph editor for workflow design
- Place management with labels, colors, and permissions
- Transition management with guards and notifications
- Guard expressions using Symfony Expression Language
- Place permission rules with conditions
- Notification settings (email, Pimcore notifications)
- Import/Export functionality (YAML, JSON)
- Version history tracking
- Workflow simulation mode
- Publishing workflows to configuration files
- Responsive ExtJS admin UI
- Support for Pimcore 11.x and 2024.x
- Support for Symfony 6.4 and 7.0

### Security
- Permission-based access control
- Admin-only workflow publishing

## [0.1.0] - 2025-12-01

### Added
- Initial development version
- Basic workflow CRUD operations
- Simple graph visualization

[Unreleased]: https://github.com/PraetorianDigital/workflow-designer-pro-bundle/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/PraetorianDigital/workflow-designer-pro-bundle/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/PraetorianDigital/workflow-designer-pro-bundle/releases/tag/v0.1.0

