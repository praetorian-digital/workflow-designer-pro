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
- **Flexible Support Strategies**: Three ways to define which objects a workflow applies to:
  - Simple class list selection
  - Expression-based conditions with templates
  - Custom service strategy for advanced logic
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
3. Configure the support strategy (see below)
4. Use the graph editor or grid views to add places and transitions
5. Configure guards, notifications, and other options
6. Validate and publish your workflow

## Support Strategies

Support strategies define which objects a workflow applies to. You can choose between three different strategies:

### Simple Strategy (Class List)

The simplest approach - select one or more Pimcore classes that the workflow should apply to.

**Use when:** You want the workflow to apply to all objects of certain classes.

**Configuration:**
- Select "Simple (Class List)" in the Strategy Type
- Choose one or more classes from the dropdown

**Generated YAML:**
```yaml
supports:
    - Pimcore\Model\DataObject\Product
    - Pimcore\Model\DataObject\Category
```

### Expression Strategy

Use Symfony expressions to define conditions for when the workflow applies. This allows you to filter based on object properties, publication state, path, and more.

**Use when:** You want the workflow to apply only to specific objects that meet certain criteria.

**Configuration:**
- Select "Expression" in the Strategy Type
- Choose the target class
- Enter an expression or use a template

**Expression Templates:**

| Template | Expression | Description |
|----------|------------|-------------|
| Property equals value | `subject.getPropertyName() == 'value'` | Check if a property equals a value |
| Property is not empty | `subject.getPropertyName() !== null and subject.getPropertyName() !== ''` | Check if property has a value |
| Object is published | `subject.isPublished() == true` | Only published objects |
| Object is not published | `subject.isPublished() == false` | Only draft objects |
| Path starts with | `subject.getPath() starts with '/folder/'` | Objects in specific folder |
| Class name equals | `subject.getClassName() == 'Product'` | Check object class |
| Property in list | `subject.getStatus() in ['draft', 'review']` | Property value in a list |
| Combined conditions | `subject.getType() == 'article' and subject.isPublished() == false` | Multiple conditions |

**Available Methods:**

| Method | Description | Return Type |
|--------|-------------|-------------|
| `subject.getId()` | Object ID | int |
| `subject.getKey()` | Object key | string |
| `subject.getPath()` | Object path | string |
| `subject.getFullPath()` | Full path with key | string |
| `subject.getParentId()` | Parent ID | int |
| `subject.getClassName()` | Class name | string |
| `subject.isPublished()` | Publication state | bool |
| `subject.getCreationDate()` | Creation timestamp | int |
| `subject.getModificationDate()` | Modification timestamp | int |
| `subject.get{PropertyName}()` | Any custom property | varies |

**Operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`, `in`, `not in`, `matches`, `starts with`, `ends with`, `contains`

**Logical Operators:** `and`, `or`, `not`

**Generated YAML:**
```yaml
support_strategy:
    type: expression
    arguments:
        - Pimcore\Model\DataObject\Product
        - "subject.getProductType() == 'article'"
```

### Custom Service Strategy

For complex logic that cannot be expressed in a simple expression, create a custom service class.

**Use when:** You need database queries, external service calls, or complex business logic.

**Configuration:**
- Select "Custom Service" in the Strategy Type
- Select from auto-detected services or enter a custom class name

**Creating a Custom Service:**

```php
<?php
namespace App\Workflow;

use Symfony\Component\Workflow\SupportStrategy\WorkflowSupportStrategyInterface;
use Symfony\Component\Workflow\WorkflowInterface;

class ProductWorkflowStrategy implements WorkflowSupportStrategyInterface
{
    public function supports(WorkflowInterface $workflow, object $subject): bool
    {
        if (!$subject instanceof \Pimcore\Model\DataObject\Product) {
            return false;
        }
        
        // Custom logic - e.g., check product category, inventory, etc.
        return $subject->getProductType() === 'article' 
            && $subject->getStock() > 0;
    }
}
```

**Register the Service:**

```yaml
# config/services.yaml
services:
    App\Workflow\ProductWorkflowStrategy:
        tags: ['workflow.support_strategy']
```

**Generated YAML:**
```yaml
support_strategy:
    service: App\Workflow\ProductWorkflowStrategy
```

### Validation Rules

The validation system checks different requirements based on the selected strategy:

| Strategy | Requirements |
|----------|-------------|
| Simple | At least one class must be selected |
| Expression | Target class AND expression required |
| Custom | Service class name required |

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
│                   ├── support-strategy.js
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

