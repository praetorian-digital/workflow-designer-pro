/**
 * Workflow Designer Pro - Notification Settings Editor
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Notification');

pimcore.plugin.WorkflowDesignerPro.Notification = Class.create({
    initialize: function (options) {
        this.settings = options.settings || {};
        this.config = options.config || {};
        this.callback = options.callback;
    },

    show: function () {
        var usersStore = (this.config.users || []).map(function (u) {
            return [u.id, u.name + (u.email ? ' <' + u.email + '>' : '')];
        });
        
        var rolesStore = (this.config.roles || []).map(function (r) {
            return [r.name, r.name];
        });

        var channelTypes = (this.config.notificationChannels || []).map(function (c) {
            return [c.type, c.label];
        });

        var mailDocuments = (this.config.mailDocuments || []).map(function (d) {
            return [d.path, d.path];
        });

        this.window = new Ext.Window({
            title: t('Notification Settings'),
            width: 600,
            height: 500,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 15,
                autoScroll: true,
                defaults: {
                    anchor: '100%',
                    labelWidth: 140
                },
                items: [
                    {
                        xtype: 'fieldset',
                        title: t('Notification Channel'),
                        items: [
                            {
                                xtype: 'checkboxgroup',
                                name: 'channelType',
                                fieldLabel: t('Channel Types'),
                                columns: 2,
                                items: channelTypes.map(function (c) {
                                    return {
                                        boxLabel: c[1],
                                        name: 'channelType',
                                        inputValue: c[0],
                                        checked: (this.settings.channelType || []).indexOf(c[0]) !== -1
                                    };
                                }.bind(this))
                            }
                        ]
                    },
                    {
                        xtype: 'fieldset',
                        title: t('Recipients'),
                        items: [
                            {
                                xtype: 'tagfield',
                                name: 'notifyUsers',
                                fieldLabel: t('Notify Users'),
                                value: this.settings.notifyUsers || [],
                                store: usersStore,
                                queryMode: 'local',
                                emptyText: 'Select specific users to notify'
                            },
                            {
                                xtype: 'tagfield',
                                name: 'notifyRoles',
                                fieldLabel: t('Notify Roles'),
                                value: this.settings.notifyRoles || [],
                                store: rolesStore,
                                queryMode: 'local',
                                emptyText: 'Notify all users with these roles'
                            }
                        ]
                    },
                    {
                        xtype: 'fieldset',
                        title: t('Email Settings'),
                        items: [
                            {
                                xtype: 'combo',
                                name: 'mailType',
                                fieldLabel: t('Mail Type'),
                                value: this.settings.mailType || 'template',
                                store: [
                                    ['template', 'Twig Template'],
                                    ['document', 'Pimcore Document']
                                ]
                            },
                            {
                                xtype: 'combo',
                                name: 'mailPath',
                                fieldLabel: t('Mail Path'),
                                value: this.settings.mailPath || '',
                                store: mailDocuments,
                                queryMode: 'local',
                                editable: true,
                                emptyText: 'Path to email template or document'
                            }
                        ]
                    }
                ]
            }],
            buttons: [
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

        var settings = {
            channelType: [],
            notifyUsers: values.notifyUsers || [],
            notifyRoles: values.notifyRoles || [],
            mailType: values.mailType,
            mailPath: values.mailPath
        };

        // Collect checked channel types
        if (values.channelType) {
            settings.channelType = Array.isArray(values.channelType) ? values.channelType : [values.channelType];
        }

        if (this.callback) {
            this.callback(settings);
        }

        this.window.close();
    }
});

