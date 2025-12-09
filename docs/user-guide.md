# Workflow Designer Pro Bundle

A visual workflow designer for Pimcore 2024.4+ that provides a graphical interface for creating, editing, and managing Pimcore workflows based on Symfony Workflow.

## Features

- **Visual Graph Editor**: Drag-and-drop interface for designing workflows
- **Full Pimcore Workflow Support**: All Pimcore workflow features including:
  - Places (states) with colors, labels, and permissions
  - Transitions with guards, notifications, and notes
  - Global actions
  - Marking store configuration
  - Audit trail support
- **Import/Export**: JSON and YAML format support
- **Workflow Simulation**: Interactive testing of workflows
- **Version Control**: Automatic versioning with rollback support
- **Real-time Validation**: Comprehensive validation with detailed error reporting
- **Publishing Pipeline**: Draft → Validate → Preview → Publish workflow

## Requirements

- Pimcore 2024.4 or later
- PHP 8.1+
- Symfony 6.2+

## Installation

The bundle is included in the project. Enable it in `config/bundles.php`:

```php
return [
    // ... other bundles
    App\WorkflowDesignerProBundle\WorkflowDesignerProBundle::class => ['all' => true],
];
```

Clear the cache and install assets:

```bash
php bin/console cache:clear
php bin/console assets:install --symlink
```

## Configuration

```yaml
# config/packages/workflow_designer_pro.yaml
workflow_designer_pro:
    storage_path: '%kernel.project_dir%/var/config/workflow_designer_pro'
    publish_path: '%kernel.project_dir%/config/workflows'
    backup_enabled: true
    max_versions: 20
    auto_cache_clear: true
```

## Permissions

Two permissions are installed:

| Permission | Description |
|------------|-------------|
| `workflow_designer` | View and edit workflows in the designer |
| `workflow_designer_publish` | Publish workflows to configuration |

Assign these permissions to users via **Settings → Users & Roles**.

## Usage

1. Navigate to **Settings → Workflow Designer Pro** in the Pimcore admin
2. Click **"New Workflow"** to create a workflow
3. Use the graph editor or grid views to add places and transitions
4. Configure guards, notifications, and other options
5. Validate and publish your workflow

## Documentation

See the full user guide at `docs/workflow-designer-pro-user-guide-en.md`

## Sample Workflows

Sample workflow files are included in `Resources/fixtures/`:

- `sample_product_workflow.json` - Simple product approval workflow
- `sample_document_workflow.yaml` - Complex document publishing workflow

Import these via the **Import** function to get started quickly.

## Architecture

### Directory Structure

```
src/WorkflowDesignerProBundle/
├── Controller/
│   └── Admin/
│       └── WorkflowController.php    # REST API endpoints
├── DependencyInjection/
│   ├── Configuration.php             # Bundle configuration
│   └── WorkflowDesignerProExtension.php
├── Installer/
│   └── Installer.php                 # Permission installation
├── Model/
│   ├── Workflow.php                  # Workflow entity
│   ├── Place.php                     # Place entity
│   ├── Transition.php                # Transition entity
│   ├── Guard.php                     # Guard configuration
│   ├── NotificationSettings.php      # Notification config
│   └── GlobalAction.php              # Global action entity
├── Service/
│   ├── WorkflowStorageService.php    # Draft/version storage
│   ├── WorkflowValidationService.php # Validation logic
│   ├── WorkflowPublishService.php    # Publishing pipeline
│   ├── WorkflowSimulationService.php # Simulation engine
│   ├── WorkflowImportExportService.php
│   └── PimcoreWorkflowConfigService.php
├── Resources/
│   ├── config/
│   │   └── services.yaml
│   ├── fixtures/                     # Sample workflows
│   └── public/
│       ├── css/
│       │   └── workflow-designer.css
│       └── js/
│           └── pimcore/
│               ├── startup.js
│               └── workflow/
│                   ├── panel.js
│                   ├── editor.js
│                   ├── graph.js
│                   ├── place.js
│                   ├── transition.js
│                   ├── guard.js
│                   ├── notification.js
│                   ├── simulation.js
│                   ├── import-export.js
│                   └── versions.js
└── WorkflowDesignerProBundle.php
```

### Storage

- **Drafts**: Stored as JSON files in `var/config/workflow_designer_pro/drafts/`
- **Versions**: Stored in `var/config/workflow_designer_pro/versions/{workflow_id}/`
- **Backups**: Created in `var/config/workflow_designer_pro/backups/` before publishing
- **Published**: Written to `config/workflows/{name}.yaml`

### API Endpoints

All endpoints are under `/admin/workflow-designer/` and require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/list` | List all workflows |
| GET | `/get/{id}` | Get workflow by ID |
| POST | `/create` | Create new workflow |
| PUT | `/save/{id}` | Save workflow |
| DELETE | `/delete/{id}` | Delete workflow |
| POST | `/validate/{id}` | Validate workflow |
| POST | `/publish/{id}` | Publish workflow |
| POST | `/unpublish/{id}` | Unpublish workflow |
| GET | `/preview/{id}` | Preview YAML output |
| GET | `/export/{id}` | Export workflow |
| POST | `/import` | Import workflow |
| POST | `/simulate/{id}` | Simulate workflow |
| GET | `/analyze/{id}` | Analyze workflow |
| GET | `/versions/{id}` | Get version history |
| POST | `/restore/{id}/{version}` | Restore version |
| GET | `/config/all` | Get configuration data |

## License

This bundle is part of the project and follows the same license terms.

## Support

For issues and feature requests, contact the development team.

