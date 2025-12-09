/**
 * Workflow Designer Pro - Version History Panel
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Versions');

pimcore.plugin.WorkflowDesignerPro.Versions = Class.create({
    initialize: function (options) {
        this.workflowId = options.workflowId;
        this.editor = options.editor;
    },

    show: function () {
        var store = new Ext.data.Store({
            fields: ['version', 'name', 'status', 'updatedAt'],
            proxy: {
                type: 'ajax',
                url: Routing.generate('workflow_designer_pro_admin_versions', {id: this.workflowId}),
                reader: {
                    type: 'json',
                    rootProperty: 'data'
                }
            },
            autoLoad: true
        });

        this.window = new Ext.Window({
            title: t('Version History'),
            width: 600,
            height: 400,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'grid',
                store: store,
                columns: [
                    {
                        text: t('Version'),
                        dataIndex: 'version',
                        width: 80,
                        renderer: function (value) {
                            return 'v' + value;
                        }
                    },
                    {
                        text: t('Name'),
                        dataIndex: 'name',
                        flex: 1
                    },
                    {
                        text: t('Status'),
                        dataIndex: 'status',
                        width: 100,
                        renderer: function (value) {
                            var color = value === 'published' ? '#27ae60' : '#3498db';
                            return '<span style="color:' + color + ';">' + value + '</span>';
                        }
                    },
                    {
                        text: t('Date'),
                        dataIndex: 'updatedAt',
                        width: 180,
                        renderer: function (value) {
                            if (value) {
                                return Ext.Date.format(new Date(value), 'Y-m-d H:i:s');
                            }
                            return '';
                        }
                    },
                    {
                        xtype: 'actioncolumn',
                        width: 100,
                        items: [
                            {
                                iconCls: 'pimcore_icon_preview',
                                tooltip: t('Preview'),
                                handler: function (grid, rowIndex) {
                                    var record = grid.getStore().getAt(rowIndex);
                                    this.previewVersion(record.get('version'));
                                }.bind(this)
                            },
                            {
                                iconCls: 'pimcore_icon_reload',
                                tooltip: t('Restore'),
                                handler: function (grid, rowIndex) {
                                    var record = grid.getStore().getAt(rowIndex);
                                    this.restoreVersion(record.get('version'));
                                }.bind(this)
                            }
                        ]
                    }
                ],
                listeners: {
                    itemdblclick: function (grid, record) {
                        this.previewVersion(record.get('version'));
                    }.bind(this)
                }
            }],
            buttons: [
                {
                    text: t('Refresh'),
                    iconCls: 'pimcore_icon_reload',
                    handler: function () {
                        store.reload();
                    }
                },
                '->',
                {
                    text: t('Close'),
                    handler: function () {
                        this.window.close();
                    }.bind(this)
                }
            ]
        });

        this.window.show();
    },

    previewVersion: function (version) {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_get', {id: this.workflowId}),
            method: 'GET',
            params: {version: version},
            success: function (response) {
                var result = Ext.decode(response.responseText);
                // For now, just show the JSON
                new Ext.Window({
                    title: t('Version') + ' v' + version,
                    width: 600,
                    height: 500,
                    modal: true,
                    layout: 'fit',
                    items: [{
                        xtype: 'textarea',
                        value: JSON.stringify(result.data, null, 2),
                        readOnly: true,
                        style: 'font-family: monospace; font-size: 12px;'
                    }]
                }).show();
            }.bind(this)
        });
    },

    restoreVersion: function (version) {
        Ext.Msg.confirm(
            t('Restore Version'),
            t('Are you sure you want to restore version') + ' v' + version + '? ' + t('This will replace the current draft.'),
            function (btn) {
                if (btn === 'yes') {
                    Ext.Ajax.request({
                        url: Routing.generate('workflow_designer_pro_admin_restore', {
                            id: this.workflowId,
                            version: version
                        }),
                        method: 'POST',
                        success: function (response) {
                            var result = Ext.decode(response.responseText);
                            if (result.success) {
                                pimcore.helpers.showNotification(t('Success'), result.message, 'success');
                                this.window.close();
                                
                                // Reload the editor
                                if (this.editor) {
                                    this.editor.workflow = result.data;
                                    // Refresh the editor panels
                                    this.editor.placesPanel.getStore().loadData(Object.values(result.data.places || {}));
                                    this.editor.transitionsPanel.getStore().loadData(Object.values(result.data.transitions || {}));
                                    this.editor.propertiesPanel.getForm().setValues(result.data);
                                    this.editor.markClean();
                                }
                            } else {
                                Ext.Msg.alert(t('Error'), result.message);
                            }
                        }.bind(this),
                        failure: function (response) {
                            var result = Ext.decode(response.responseText);
                            Ext.Msg.alert(t('Error'), result?.message || 'Restore failed');
                        }
                    });
                }
            }.bind(this)
        );
    }
});

