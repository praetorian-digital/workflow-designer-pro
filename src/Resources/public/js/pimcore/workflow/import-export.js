/**
 * Workflow Designer Pro - Import/Export Utilities
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.ImportExport');

pimcore.plugin.WorkflowDesignerPro.ImportExport = Class.create({
    initialize: function (options) {
        this.panel = options.panel;
    },

    showImportDialog: function () {
        this.importWindow = new Ext.Window({
            title: t('Import Workflow'),
            width: 500,
            height: 350,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'tabpanel',
                items: [
                    this.getFileImportTab(),
                    this.getPasteImportTab()
                ]
            }],
            buttons: [
                {
                    text: t('Cancel'),
                    handler: function () {
                        this.importWindow.close();
                    }.bind(this)
                }
            ]
        });

        this.importWindow.show();
    },

    getFileImportTab: function () {
        return {
            title: t('Upload File'),
            xtype: 'form',
            bodyPadding: 15,
            items: [
                {
                    xtype: 'displayfield',
                    value: t('Select a JSON or YAML file to import:')
                },
                {
                    xtype: 'filefield',
                    name: 'file',
                    fieldLabel: t('File'),
                    labelWidth: 80,
                    anchor: '100%',
                    buttonText: t('Browse...'),
                    accept: '.json,.yaml,.yml'
                }
            ],
            buttons: [
                {
                    text: t('Import'),
                    iconCls: 'pimcore_icon_import',
                    handler: function (btn) {
                        var form = btn.up('form').getForm();
                        if (form.isValid()) {
                            form.submit({
                                url: Routing.generate('workflow_designer_pro_admin_import'),
                                waitMsg: t('Importing...'),
                                success: function (form, action) {
                                    var result = action.result;
                                    if (result.success) {
                                        pimcore.helpers.showNotification(t('Success'), result.message, 'success');
                                        this.importWindow.close();
                                        if (this.panel) {
                                            this.panel.refreshList();
                                            this.panel.openWorkflow(result.data.id, result.data.name);
                                        }
                                    } else {
                                        Ext.Msg.alert(t('Error'), result.message);
                                    }
                                }.bind(this),
                                failure: function (form, action) {
                                    Ext.Msg.alert(t('Error'), action.result?.message || 'Import failed');
                                }
                            });
                        }
                    }.bind(this)
                }
            ]
        };
    },

    getPasteImportTab: function () {
        return {
            title: t('Paste Content'),
            xtype: 'form',
            bodyPadding: 15,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'combo',
                    name: 'format',
                    fieldLabel: t('Format'),
                    labelWidth: 80,
                    value: 'json',
                    store: [['json', 'JSON'], ['yaml', 'YAML']],
                    editable: false
                },
                {
                    xtype: 'textarea',
                    name: 'content',
                    fieldLabel: t('Content'),
                    labelWidth: 80,
                    flex: 1,
                    emptyText: t('Paste workflow JSON or YAML here...')
                }
            ],
            buttons: [
                {
                    text: t('Import'),
                    iconCls: 'pimcore_icon_import',
                    handler: function (btn) {
                        var form = btn.up('form').getForm();
                        var values = form.getValues();
                        
                        if (!values.content) {
                            Ext.Msg.alert(t('Error'), t('Please paste some content'));
                            return;
                        }

                        var contentType = values.format === 'yaml' ? 'application/x-yaml' : 'application/json';

                        Ext.Ajax.request({
                            url: Routing.generate('workflow_designer_pro_admin_import'),
                            method: 'POST',
                            headers: {
                                'Content-Type': contentType
                            },
                            rawData: values.content,
                            success: function (response) {
                                var result = Ext.decode(response.responseText);
                                if (result.success) {
                                    pimcore.helpers.showNotification(t('Success'), result.message, 'success');
                                    this.importWindow.close();
                                    if (this.panel) {
                                        this.panel.refreshList();
                                        this.panel.openWorkflow(result.data.id, result.data.name);
                                    }
                                } else {
                                    Ext.Msg.alert(t('Error'), result.message);
                                }
                            }.bind(this),
                            failure: function (response) {
                                var result = Ext.decode(response.responseText);
                                Ext.Msg.alert(t('Error'), result?.message || 'Import failed');
                            }
                        });
                    }.bind(this)
                }
            ]
        };
    },

    showExportDialog: function (workflowId, workflowName) {
        new Ext.Window({
            title: t('Export Workflow') + ': ' + workflowName,
            width: 400,
            height: 200,
            modal: true,
            bodyPadding: 20,
            items: [
                {
                    xtype: 'displayfield',
                    value: t('Select export format:')
                },
                {
                    xtype: 'radiogroup',
                    itemId: 'formatGroup',
                    columns: 2,
                    items: [
                        {boxLabel: 'JSON', name: 'format', inputValue: 'json', checked: true},
                        {boxLabel: 'YAML (Pimcore)', name: 'format', inputValue: 'yaml'}
                    ]
                }
            ],
            buttons: [
                {
                    text: t('Cancel'),
                    handler: function (btn) {
                        btn.up('window').close();
                    }
                },
                {
                    text: t('Download'),
                    iconCls: 'pimcore_icon_download',
                    handler: function (btn) {
                        var win = btn.up('window');
                        var format = win.down('#formatGroup').getValue().format;
                        var url = Routing.generate('workflow_designer_pro_admin_export', {id: workflowId}) + '?format=' + format;
                        pimcore.helpers.download(url);
                        win.close();
                    }
                }
            ]
        }).show();
    }
});

