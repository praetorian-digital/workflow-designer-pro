/**
 * Workflow Designer Pro - Startup Script
 * Registers the main menu entry and initializes the bundle
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro');

pimcore.plugin.WorkflowDesignerPro = Class.create({
    initialize: function () {
        document.addEventListener(pimcore.events.preMenuBuild, this.preMenuBuild.bind(this));
        document.addEventListener(pimcore.events.pimcoreReady, this.pimcoreReady.bind(this));
    },

    preMenuBuild: function (event) {
        var menu = event.detail.menu;
        var user = pimcore.globalmanager.get('user');

        // Check permission - admin users always have access, or users with workflow_designer permission
        var hasAccess = user.admin || user.isAllowed('workflow_designer');
        if (!hasAccess) {
            return;
        }

        // Add to Settings menu
        var settingsMenu = menu.settings;
        if (settingsMenu && settingsMenu.items) {
            settingsMenu.items.push({
                text: t('Workflow Designer Pro'),
                iconCls: 'pimcore_material_icon_workflow pimcore_material_icon',
                priority: 80,
                handler: this.openPanel.bind(this)
            });
        }

        // Also add as top-level menu for easy access
        menu.workflow_designer = {
            label: t('Workflow Designer'),
            iconCls: 'pimcore_material_icon_workflow pimcore_material_icon',
            priority: 50,
            handler: this.openPanel.bind(this),
            noSubmenus: true
        };
    },

    pimcoreReady: function (event) {
        // Initialize any global state needed
    },

    openPanel: function () {
        try {
            pimcore.globalmanager.get('workflow_designer_pro_panel').activate();
        } catch (e) {
            pimcore.globalmanager.add(
                'workflow_designer_pro_panel',
                new pimcore.plugin.WorkflowDesignerPro.Panel()
            );
        }
    }
});

// Initialize the plugin
var workflowDesignerPro = new pimcore.plugin.WorkflowDesignerPro();

