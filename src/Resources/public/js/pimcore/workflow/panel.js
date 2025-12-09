/**
 * Workflow Designer Pro - Main Panel
 * The main container panel with workflow list and editor tabs
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Panel');

pimcore.plugin.WorkflowDesignerPro.Panel = Class.create({
    initialize: function () {
        this.config = null;
        this.loadConfig();
        this.getPanel();
    },

    loadConfig: function () {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_config_all'),
            method: 'GET',
            success: function (response) {
                var data = Ext.decode(response.responseText);
                if (data.success) {
                    this.config = data.data;
                }
            }.bind(this)
        });
    },

    getPanel: function () {
        if (!this.panel) {
            this.panel = new Ext.Panel({
                id: 'workflow_designer_pro_panel',
                title: t('Workflow Designer Pro'),
                iconCls: 'pimcore_material_icon_workflow pimcore_material_icon',
                border: false,
                layout: 'border',
                closable: true,
                items: [
                    this.getWorkflowListPanel(),
                    this.getTabPanel()
                ],
                tbar: this.getToolbar()
            });

            var tabPanel = Ext.getCmp('pimcore_panel_tabs');
            tabPanel.add(this.panel);
            tabPanel.setActiveItem(this.panel);

            this.panel.on('destroy', function () {
                pimcore.globalmanager.remove('workflow_designer_pro_panel');
            }.bind(this));

            pimcore.layout.refresh();
        }

        return this.panel;
    },

    getToolbar: function () {
        return {
            items: [
                {
                    text: t('New Workflow'),
                    iconCls: 'pimcore_icon_add',
                    handler: this.createWorkflow.bind(this)
                },
                '-',
                {
                    text: t('Import'),
                    iconCls: 'pimcore_icon_import',
                    handler: this.importWorkflow.bind(this)
                },
                '-',
                {
                    text: t('Refresh'),
                    iconCls: 'pimcore_icon_reload',
                    handler: this.refreshList.bind(this)
                }
            ]
        };
    },

    getWorkflowListPanel: function () {
        if (!this.workflowListPanel) {
            var store = new Ext.data.Store({
                proxy: {
                    type: 'ajax',
                    url: Routing.generate('workflow_designer_pro_admin_list'),
                    reader: {
                        type: 'json',
                        rootProperty: 'data'
                    }
                },
                fields: ['id', 'name', 'type', 'supports', 'status', 'placesCount', 'transitionsCount', 'createdAt', 'updatedAt', 'isPublished'],
                autoLoad: true
            });

            this.workflowListPanel = new Ext.grid.Panel({
                region: 'west',
                title: t('Workflows'),
                width: 320,
                split: true,
                collapsible: true,
                store: store,
                columns: [
                    {
                        text: t('Status'),
                        dataIndex: 'isPublished',
                        width: 50,
                        renderer: function (value, meta, record) {
                            var status = record.get('status');
                            if (value) {
                                return '<span class="pimcore_icon_accept" style="display:inline-block;width:16px;height:16px;" title="Published"></span>';
                            } else if (status === 'draft') {
                                return '<span class="pimcore_icon_edit" style="display:inline-block;width:16px;height:16px;" title="Draft"></span>';
                            }
                            return '';
                        }
                    },
                    {
                        text: t('Name'),
                        dataIndex: 'name',
                        flex: 1
                    },
                    {
                        text: t('Type'),
                        dataIndex: 'type',
                        width: 80
                    },
                    {
                        text: t('Places'),
                        dataIndex: 'placesCount',
                        width: 50,
                        align: 'center'
                    },
                    {
                        text: t('Transitions'),
                        dataIndex: 'transitionsCount',
                        width: 60,
                        align: 'center'
                    }
                ],
                listeners: {
                    itemdblclick: function (grid, record) {
                        this.openWorkflow(record.get('id'), record.get('name'));
                    }.bind(this),
                    itemcontextmenu: function (grid, record, item, index, e) {
                        e.stopEvent();
                        this.showContextMenu(record, e);
                    }.bind(this)
                },
                tbar: {
                    items: [
                        {
                            xtype: 'textfield',
                            emptyText: t('Search...'),
                            width: '100%',
                            listeners: {
                                change: function (field, value) {
                                    var store = this.workflowListPanel.getStore();
                                    store.clearFilter();
                                    if (value) {
                                        store.filterBy(function (record) {
                                            return record.get('name').toLowerCase().indexOf(value.toLowerCase()) !== -1;
                                        });
                                    }
                                }.bind(this)
                            }
                        }
                    ]
                }
            });
        }

        return this.workflowListPanel;
    },

    getTabPanel: function () {
        if (!this.tabPanel) {
            this.tabPanel = new Ext.TabPanel({
                region: 'center',
                deferredRender: true,
                enableTabScroll: true,
                border: false,
                items: [{
                    title: t('Welcome'),
                    iconCls: 'pimcore_icon_info',
                    bodyPadding: 20,
                    html: this.getWelcomeHtml()
                }]
            });
        }

        return this.tabPanel;
    },

    getWelcomeHtml: function () {
        return '<div style="font-family: Arial, sans-serif; max-width: 800px;">' +
            '<h1 style="color: #3498db;">Workflow Designer Pro</h1>' +
            '<p style="font-size: 14px; color: #666;">Create and manage Pimcore workflows with a visual designer.</p>' +
            '<h2 style="margin-top: 30px;">Getting Started</h2>' +
            '<ul style="font-size: 14px; color: #555; line-height: 1.8;">' +
            '<li>Click <strong>"New Workflow"</strong> to create a new workflow</li>' +
            '<li>Double-click a workflow in the list to open it</li>' +
            '<li>Use the graph editor to add places and transitions</li>' +
            '<li>Configure guards, notifications, and metadata</li>' +
            '<li>Validate and publish your workflow when ready</li>' +
            '</ul>' +
            '<h2 style="margin-top: 30px;">Features</h2>' +
            '<ul style="font-size: 14px; color: #555; line-height: 1.8;">' +
            '<li>Visual graph editor with drag-and-drop support</li>' +
            '<li>Full support for Pimcore workflow features</li>' +
            '<li>Import/export workflows as YAML or JSON</li>' +
            '<li>Workflow simulation and validation</li>' +
            '<li>Version history with rollback support</li>' +
            '</ul>' +
            '</div>';
    },

    showContextMenu: function (record, e) {
        var menu = new Ext.menu.Menu({
            items: [
                {
                    text: t('Open'),
                    iconCls: 'pimcore_icon_open',
                    handler: function () {
                        this.openWorkflow(record.get('id'), record.get('name'));
                    }.bind(this)
                },
                '-',
                {
                    text: t('Export'),
                    iconCls: 'pimcore_icon_export',
                    menu: [
                        {
                            text: 'JSON',
                            handler: function () {
                                this.exportWorkflow(record.get('id'), 'json');
                            }.bind(this)
                        },
                        {
                            text: 'YAML',
                            handler: function () {
                                this.exportWorkflow(record.get('id'), 'yaml');
                            }.bind(this)
                        }
                    ]
                },
                {
                    text: t('Duplicate'),
                    iconCls: 'pimcore_icon_copy',
                    handler: function () {
                        this.duplicateWorkflow(record.get('id'));
                    }.bind(this)
                },
                '-',
                {
                    text: record.get('isPublished') ? t('Unpublish') : t('Publish'),
                    iconCls: record.get('isPublished') ? 'pimcore_icon_unpublish' : 'pimcore_icon_publish',
                    handler: function () {
                        if (record.get('isPublished')) {
                            this.unpublishWorkflow(record.get('id'));
                        } else {
                            this.publishWorkflow(record.get('id'));
                        }
                    }.bind(this)
                },
                '-',
                {
                    text: t('Delete'),
                    iconCls: 'pimcore_icon_delete',
                    handler: function () {
                        this.deleteWorkflow(record.get('id'), record.get('name'));
                    }.bind(this)
                }
            ]
        });

        menu.showAt(e.getXY());
    },

    activate: function () {
        var tabPanel = Ext.getCmp('pimcore_panel_tabs');
        tabPanel.setActiveItem(this.panel);
    },

    createWorkflow: function () {
        Ext.MessageBox.prompt(
            t('New Workflow'),
            t('Please enter a name for the new workflow (lowercase, no spaces):'),
            function (btn, name) {
                if (btn === 'ok' && name) {
                    name = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                    
                    Ext.Ajax.request({
                        url: Routing.generate('workflow_designer_pro_admin_create'),
                        method: 'POST',
                        jsonData: {
                            name: name,
                            type: 'workflow',
                            supports: []
                        },
                        success: function (response) {
                            var data = Ext.decode(response.responseText);
                            if (data.success) {
                                pimcore.helpers.showNotification(t('Success'), data.message, 'success');
                                this.refreshList();
                                this.openWorkflow(data.data.id, data.data.name);
                            } else {
                                Ext.Msg.alert(t('Error'), data.message);
                            }
                        }.bind(this),
                        failure: function (response) {
                            var data = Ext.decode(response.responseText);
                            Ext.Msg.alert(t('Error'), data.message || 'Failed to create workflow');
                        }
                    });
                }
            }.bind(this)
        );
    },

    openWorkflow: function (id, name) {
        var tabId = 'workflow_designer_editor_' + id;
        var existingTab = this.tabPanel.getComponent(tabId);

        if (existingTab) {
            this.tabPanel.setActiveItem(existingTab);
            return;
        }

        // Load workflow data
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_get', {id: id}),
            method: 'GET',
            success: function (response) {
                var data = Ext.decode(response.responseText);
                if (data.success) {
                    var editor = new pimcore.plugin.WorkflowDesignerPro.Editor({
                        id: tabId,
                        workflow: data.data,
                        config: this.config,
                        panel: this
                    });
                    this.tabPanel.add(editor.getPanel());
                    this.tabPanel.setActiveItem(editor.getPanel());
                } else {
                    Ext.Msg.alert(t('Error'), data.message);
                }
            }.bind(this),
            failure: function () {
                Ext.Msg.alert(t('Error'), 'Failed to load workflow');
            }
        });
    },

    refreshList: function () {
        this.workflowListPanel.getStore().reload();
    },

    exportWorkflow: function (id, format) {
        var url = Routing.generate('workflow_designer_pro_admin_export', {id: id}) + '?format=' + format;
        pimcore.helpers.download(url);
    },

    importWorkflow: function () {
        pimcore.helpers.uploadDialog(
            Routing.generate('workflow_designer_pro_admin_import'),
            'file',
            function (response) {
                var data = Ext.decode(response.response.responseText);
                if (data.success) {
                    pimcore.helpers.showNotification(t('Success'), data.message, 'success');
                    this.refreshList();
                    this.openWorkflow(data.data.id, data.data.name);
                } else {
                    Ext.Msg.alert(t('Error'), data.message);
                }
            }.bind(this),
            function (response) {
                Ext.Msg.alert(t('Error'), 'Import failed');
            }
        );
    },

    duplicateWorkflow: function (id) {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_get', {id: id}),
            method: 'GET',
            success: function (response) {
                var data = Ext.decode(response.responseText);
                if (data.success) {
                    var workflow = data.data;
                    
                    Ext.MessageBox.prompt(
                        t('Duplicate Workflow'),
                        t('Enter name for the duplicated workflow:'),
                        function (btn, name) {
                            if (btn === 'ok' && name) {
                                workflow.name = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                                delete workflow.id;
                                
                                Ext.Ajax.request({
                                    url: Routing.generate('workflow_designer_pro_admin_create'),
                                    method: 'POST',
                                    jsonData: workflow,
                                    success: function (response) {
                                        var data = Ext.decode(response.responseText);
                                        if (data.success) {
                                            // Save the full workflow data
                                            Ext.Ajax.request({
                                                url: Routing.generate('workflow_designer_pro_admin_save', {id: data.data.id}),
                                                method: 'PUT',
                                                jsonData: workflow,
                                                success: function () {
                                                    pimcore.helpers.showNotification(t('Success'), 'Workflow duplicated', 'success');
                                                    this.refreshList();
                                                }.bind(this)
                                            });
                                        }
                                    }.bind(this)
                                });
                            }
                        }.bind(this),
                        this,
                        false,
                        workflow.name + '_copy'
                    );
                }
            }.bind(this)
        });
    },

    publishWorkflow: function (id) {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_publish', {id: id}),
            method: 'POST',
            success: function (response) {
                var data = Ext.decode(response.responseText);
                if (data.success) {
                    pimcore.helpers.showNotification(t('Success'), data.message, 'success');
                    this.refreshList();
                } else {
                    Ext.Msg.alert(t('Error'), data.message);
                }
            }.bind(this)
        });
    },

    unpublishWorkflow: function (id) {
        Ext.Msg.confirm(t('Unpublish'), t('Are you sure you want to unpublish this workflow?'), function (btn) {
            if (btn === 'yes') {
                Ext.Ajax.request({
                    url: Routing.generate('workflow_designer_pro_admin_unpublish', {id: id}),
                    method: 'POST',
                    success: function (response) {
                        var data = Ext.decode(response.responseText);
                        if (data.success) {
                            pimcore.helpers.showNotification(t('Success'), data.message, 'success');
                            this.refreshList();
                        } else {
                            Ext.Msg.alert(t('Error'), data.message);
                        }
                    }.bind(this)
                });
            }
        }.bind(this));
    },

    deleteWorkflow: function (id, name) {
        Ext.Msg.confirm(t('Delete'), t('Are you sure you want to delete workflow "' + name + '"?'), function (btn) {
            if (btn === 'yes') {
                Ext.Ajax.request({
                    url: Routing.generate('workflow_designer_pro_admin_delete', {id: id}),
                    method: 'DELETE',
                    success: function (response) {
                        var data = Ext.decode(response.responseText);
                        if (data.success) {
                            pimcore.helpers.showNotification(t('Success'), data.message, 'success');
                            this.refreshList();
                            
                            // Close tab if open
                            var tabId = 'workflow_designer_editor_' + id;
                            var tab = this.tabPanel.getComponent(tabId);
                            if (tab) {
                                this.tabPanel.remove(tab);
                            }
                        } else {
                            Ext.Msg.alert(t('Error'), data.message);
                        }
                    }.bind(this)
                });
            }
        }.bind(this));
    }
});

