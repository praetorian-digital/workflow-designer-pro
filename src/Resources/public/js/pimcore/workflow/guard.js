/**
 * Workflow Designer Pro - Guard Editor
 * Standalone guard configuration dialog
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Guard');

pimcore.plugin.WorkflowDesignerPro.Guard = Class.create({
    initialize: function (options) {
        this.guard = options.guard || {};
        this.config = options.config || {};
        this.callback = options.callback;
    },

    show: function () {
        var rolesStore = (this.config.roles || []).map(function (r) {
            return [r.name, r.name];
        });
        var permissionsStore = (this.config.permissions || []).map(function (p) {
            return [p.key, p.key + ' (' + (p.category || 'General') + ')'];
        });

        this.window = new Ext.Window({
            title: t('Configure Guard'),
            width: 600,
            height: 450,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 15,
                defaults: {
                    anchor: '100%',
                    labelWidth: 140
                },
                items: [
                    {
                        xtype: 'fieldset',
                        title: t('Expression Guard'),
                        collapsible: true,
                        items: [
                            {
                                xtype: 'textarea',
                                name: 'expression',
                                fieldLabel: t('Expression'),
                                value: this.guard.expression || '',
                                height: 80,
                                emptyText: 'Symfony Expression Language, e.g.: subject.getStatus() == "approved"'
                            },
                            {
                                xtype: 'displayfield',
                                fieldLabel: '',
                                value: '<small style="color:#666;">' +
                                    'Available variables: <code>subject</code> (the workflow subject), ' +
                                    '<code>user</code> (current user), <code>token</code> (security token)' +
                                    '</small>'
                            }
                        ]
                    },
                    {
                        xtype: 'fieldset',
                        title: t('Role-based Guard'),
                        collapsible: true,
                        items: [
                            {
                                xtype: 'tagfield',
                                name: 'roles',
                                fieldLabel: t('Required Roles'),
                                value: this.guard.roles || [],
                                store: rolesStore,
                                queryMode: 'local',
                                emptyText: 'User must have one of these roles'
                            }
                        ]
                    },
                    {
                        xtype: 'fieldset',
                        title: t('Permission-based Guard'),
                        collapsible: true,
                        items: [
                            {
                                xtype: 'tagfield',
                                name: 'permissions',
                                fieldLabel: t('Required Permissions'),
                                value: this.guard.permissions || [],
                                store: permissionsStore,
                                queryMode: 'local',
                                emptyText: 'User must have one of these permissions'
                            }
                        ]
                    },
                    {
                        xtype: 'fieldset',
                        title: t('Custom Service Guard'),
                        collapsible: true,
                        collapsed: true,
                        items: [
                            {
                                xtype: 'textfield',
                                name: 'service',
                                fieldLabel: t('Service ID'),
                                value: this.guard.service || '',
                                emptyText: 'e.g.: App\\Workflow\\Guard\\MyGuard'
                            },
                            {
                                xtype: 'displayfield',
                                fieldLabel: '',
                                value: '<small style="color:#666;">' +
                                    'Service must implement <code>GuardInterface</code> or be callable' +
                                    '</small>'
                            }
                        ]
                    }
                ]
            }],
            buttons: [
                {
                    text: t('Clear All'),
                    iconCls: 'pimcore_icon_delete',
                    handler: function () {
                        var form = this.window.down('form').getForm();
                        form.reset();
                    }.bind(this)
                },
                '->',
                {
                    text: t('Cancel'),
                    handler: function () {
                        this.window.close();
                    }.bind(this)
                },
                {
                    text: t('Apply'),
                    iconCls: 'pimcore_icon_apply',
                    handler: this.save.bind(this)
                }
            ]
        });

        this.window.show();
    },

    save: function () {
        var form = this.window.down('form').getForm();
        var values = form.getValues();

        var guard = {};
        
        if (values.expression) {
            guard.expression = values.expression;
        }
        if (values.roles && values.roles.length) {
            guard.roles = Array.isArray(values.roles) ? values.roles : [values.roles];
        }
        if (values.permissions && values.permissions.length) {
            guard.permissions = Array.isArray(values.permissions) ? values.permissions : [values.permissions];
        }
        if (values.service) {
            guard.service = values.service;
        }

        if (this.callback) {
            this.callback(guard);
        }

        this.window.close();
    }
});

