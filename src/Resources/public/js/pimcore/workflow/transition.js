/**
 * Workflow Designer Pro - Transition Editor
 * Dialog for editing transition properties
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Transition');

pimcore.plugin.WorkflowDesignerPro.Transition = Class.create({
    initialize: function (options) {
        this.transition = options.transition || {};
        this.places = options.places || [];
        this.config = options.config || {};
        this.callback = options.callback;
    },

    /**
     * Create a field label with an info icon tooltip
     */
    createLabelWithTooltip: function(label, tooltip) {
        return '<span>' + t(label) + '</span>' +
            '<span class="workflow-field-info" data-qtip="' + Ext.String.htmlEncode(tooltip) + '">' +
            ' <i class="pimcore_icon_info" style="font-size: 11px; color: #888; cursor: help;"></i>' +
            '</span>';
    },

    show: function () {
        var placeNames = this.places.map(function (p) { return p.name; });

        this.window = new Ext.Window({
            title: t('Edit Transition') + ': ' + (this.transition.name || t('New Transition')),
            width: 750,
            height: 650,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'tabpanel',
                items: [
                    this.getGeneralTab(placeNames),
                    this.getGuardTab(),
                    this.getNotificationTab(),
                    this.getNotesTab(),
                    this.getMetadataTab()
                ]
            }],
            buttons: [
                {
                    text: t('Cancel'),
                    iconCls: 'pimcore_icon_cancel',
                    handler: function () {
                        this.window.close();
                    }.bind(this)
                },
                {
                    text: t('Save'),
                    iconCls: 'pimcore_icon_save',
                    handler: this.save.bind(this)
                }
            ]
        });

        this.window.show();
    },

    getGeneralTab: function (placeNames) {
        var iconStore = (this.config.icons || []).map(function (i) {
            return [i.class, i.label];
        });

        var publicationStates = (this.config.publicationStates || []).map(function (s) {
            return [s.value, s.label];
        });

        return {
            title: t('General'),
            xtype: 'form',
            bodyPadding: 10,
            scrollable: true,
            defaults: {
                anchor: '100%',
                labelWidth: 150
            },
            items: [
                {
                    xtype: 'fieldset',
                    title: t('Identification'),
                    defaults: { anchor: '100%', labelWidth: 130 },
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'name',
                            fieldLabel: this.createLabelWithTooltip('Name',
                                'Technical identifier for this transition. ' +
                                'Must be lowercase with underscores (e.g., submit_for_review). ' +
                                'Used in code and API calls. Not shown to end users.'),
                            value: this.transition.name || '',
                            allowBlank: false,
                            regex: /^[a-z][a-z0-9_]*$/,
                            regexText: t('Must be lowercase, start with letter, only letters, numbers, underscores'),
                            emptyText: 'e.g., submit_for_review'
                        },
                        {
                            xtype: 'textfield',
                            name: 'label',
                            fieldLabel: this.createLabelWithTooltip('Label',
                                'Human-readable name shown on buttons and in the workflow UI. ' +
                                'This is what users see when they can execute this transition. ' +
                                'Can include spaces and proper capitalization.'),
                            value: this.transition.label || '',
                            emptyText: 'e.g., Submit for Review'
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: t('Flow'),
                    defaults: { anchor: '100%', labelWidth: 130 },
                    items: [
                        {
                            xtype: 'tagfield',
                            name: 'from',
                            fieldLabel: this.createLabelWithTooltip('From Places',
                                'Source place(s) where this transition can be triggered. ' +
                                'The object must be in one of these states for the transition to be available. ' +
                                'Select one or more places.'),
                            value: this.transition.from || [],
                            store: placeNames,
                            queryMode: 'local',
                            emptyText: 'Select source place(s)'
                        },
                        {
                            xtype: 'tagfield',
                            name: 'to',
                            fieldLabel: this.createLabelWithTooltip('To Places',
                                'Target place(s) the object moves to after this transition. ' +
                                'For standard workflows, select exactly one target place. ' +
                                'Multiple targets are for state machines with parallel states.'),
                            value: this.transition.to || [],
                            store: placeNames,
                            queryMode: 'local',
                            emptyText: 'Select target place(s)'
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: t('Appearance & Behavior'),
                    defaults: { anchor: '100%', labelWidth: 130 },
                    items: [
                        {
                            xtype: 'combo',
                            name: 'iconClass',
                            fieldLabel: this.createLabelWithTooltip('Icon',
                                'Icon displayed next to the transition button/action. ' +
                                'Select from predefined Pimcore icons or enter a custom CSS class. ' +
                                'Helps users visually identify the action.'),
                            value: this.transition.iconClass || '',
                            store: iconStore,
                            editable: true,
                            emptyText: 'Select or enter icon class'
                        },
                        {
                            xtype: 'textfield',
                            name: 'objectLayout',
                            fieldLabel: this.createLabelWithTooltip('Object Layout',
                                'Optional: Specify a custom object layout variant to use after this transition. ' +
                                'Allows showing different fields/tabs based on the workflow state. ' +
                                'Leave empty to use the default layout.'),
                            value: this.transition.objectLayout || '',
                            emptyText: 'e.g., review_layout'
                        },
                        {
                            xtype: 'combo',
                            name: 'changePublicationState',
                            fieldLabel: this.createLabelWithTooltip('Publication State',
                                'Automatically change the object\'s publication state when this transition executes. ' +
                                '"force_published" publishes the object, "force_unpublished" unpublishes it. ' +
                                'Leave empty for no automatic change.'),
                            value: this.transition.changePublicationState || '',
                            store: publicationStates.length ? publicationStates : [
                                ['', '(No change)'],
                                ['force_published', 'Force Published'],
                                ['force_unpublished', 'Force Unpublished']
                            ],
                            editable: false,
                            emptyText: 'Select publication behavior'
                        }
                    ]
                }
            ]
        };
    },

    getGuardTab: function () {
        var guard = this.transition.guard || {};
        var self = this;
        
        // Convert legacy format (roles/permissions arrays) to expression if needed
        var guardExpression = '';
        if (typeof guard === 'string') {
            guardExpression = guard;
        } else if (guard.expression) {
            guardExpression = guard.expression;
        }

        return {
            title: t('Guard'),
            xtype: 'form',
            bodyPadding: 10,
            scrollable: true,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'panel',
                    border: false,
                    bodyPadding: '0 0 15 0',
                    html: '<div style="color: #666; font-size: 12px; background: #f5f5f5; padding: 12px; border-radius: 4px;">' +
                        '<strong style="color: #333;">Guard Expression</strong><br><br>' +
                        'A guard controls who can execute this transition using a <strong>Symfony Expression</strong>.<br>' +
                        'The expression has access to:<br>' +
                        '• <code style="background:#e8e8e8;padding:2px 4px;border-radius:2px;">subject</code> - The object being transitioned<br>' +
                        '• <code style="background:#e8e8e8;padding:2px 4px;border-radius:2px;">user</code> - The current Pimcore user<br>' +
                        '• <code style="background:#e8e8e8;padding:2px 4px;border-radius:2px;">is_granted()</code> - Check Symfony security roles<br>' +
                        '</div>'
                },
                {
                    xtype: 'textarea',
                    itemId: 'guardExpression',
                    name: 'guard_expression',
                    fieldLabel: t('Guard Expression'),
                    labelAlign: 'top',
                    value: guardExpression,
                    height: 100,
                    style: 'font-family: monospace; font-size: 13px;',
                    emptyText: 'Leave empty to allow all users, or enter a Symfony expression...'
                },
                {
                    xtype: 'panel',
                    border: false,
                    bodyPadding: '10 0',
                    layout: {
                        type: 'hbox',
                        pack: 'start'
                    },
                    items: [
                        {
                            xtype: 'button',
                            text: 'Insert Role Check',
                            iconCls: 'pimcore_icon_roles',
                            margin: '0 5 0 0',
                            menu: [
                                { text: 'ROLE_PIMCORE_ADMIN', handler: function() { self.insertGuardText("is_granted('ROLE_PIMCORE_ADMIN')"); }},
                                { text: 'ROLE_EDITOR', handler: function() { self.insertGuardText("is_granted('ROLE_EDITOR')"); }},
                                { text: 'ROLE_REVIEWER', handler: function() { self.insertGuardText("is_granted('ROLE_REVIEWER')"); }},
                                { text: 'ROLE_PUBLISHER', handler: function() { self.insertGuardText("is_granted('ROLE_PUBLISHER')"); }},
                                '-',
                                { text: 'Custom Role...', handler: function() { self.promptInsertRole(); }}
                            ]
                        },
                        {
                            xtype: 'button',
                            text: 'Insert Permission Check',
                            iconCls: 'pimcore_icon_lock',
                            margin: '0 5 0 0',
                            menu: [
                                { text: 'Can Save', handler: function() { self.insertGuardText("subject.isAllowed('save')"); }},
                                { text: 'Can Publish', handler: function() { self.insertGuardText("subject.isAllowed('publish')"); }},
                                { text: 'Can Delete', handler: function() { self.insertGuardText("subject.isAllowed('delete')"); }},
                                { text: 'Has Objects Permission', handler: function() { self.insertGuardText("subject.isAllowed('objects')"); }}
                            ]
                        },
                        {
                            xtype: 'button',
                            text: 'Insert Operator',
                            iconCls: 'pimcore_icon_operator',
                            menu: [
                                { text: 'AND (both must be true)', handler: function() { self.insertGuardText(' and '); }},
                                { text: 'OR (either can be true)', handler: function() { self.insertGuardText(' or '); }},
                                { text: 'NOT (negate)', handler: function() { self.insertGuardText('not '); }}
                            ]
                        }
                    ]
                },
                {
                    xtype: 'panel',
                    border: false,
                    bodyPadding: '15 0 0 0',
                    html: '<div style="color: #666; font-size: 12px; background: #fffbea; padding: 12px; border-radius: 4px; border-left: 3px solid #f0ad4e;">' +
                        '<strong style="color: #8a6d3b;">Common Expression Examples</strong><br><br>' +
                        '<table style="width:100%; font-size: 11px;">' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>is_granted(\'ROLE_PIMCORE_ADMIN\')</code></td><td style="padding: 4px 0;">Only admins can execute</td></tr>' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>subject.isAllowed(\'publish\')</code></td><td style="padding: 4px 0;">User has publish permission on object</td></tr>' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>is_granted(\'ROLE_EDITOR\') or is_granted(\'ROLE_ADMIN\')</code></td><td style="padding: 4px 0;">Editor OR Admin can execute</td></tr>' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>subject.isAllowed(\'save\') and is_granted(\'ROLE_EDITOR\')</code></td><td style="padding: 4px 0;">Must have save permission AND be editor</td></tr>' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>is_fully_authenticated()</code></td><td style="padding: 4px 0;">User is fully authenticated (not remembered)</td></tr>' +
                        '<tr><td style="padding: 4px 8px 4px 0; vertical-align: top;"><code>subject.getProperty(\'owner\') == user.getId()</code></td><td style="padding: 4px 0;">User is the owner of the object</td></tr>' +
                        '</table>' +
                        '</div>'
                },
                {
                    xtype: 'panel',
                    border: false,
                    bodyPadding: '10 0 0 0',
                    html: '<div style="color: #666; font-size: 11px;">' +
                        '<strong>Available Methods:</strong><br>' +
                        '• <code>is_granted(\'ROLE_NAME\')</code> - Check if user has a Symfony role<br>' +
                        '• <code>subject.isAllowed(\'permission\')</code> - Check Pimcore permission on object<br>' +
                        '• <code>subject.getProperty(\'name\')</code> - Get object property<br>' +
                        '• <code>subject.getId()</code> - Get object ID<br>' +
                        '• <code>subject.getClassName()</code> - Get object class name<br>' +
                        '• <code>user.getId()</code> - Get current user ID<br>' +
                        '• <code>user.getName()</code> - Get current username<br>' +
                        '• <code>user.isAdmin()</code> - Check if user is admin<br>' +
                        '</div>'
                }
            ]
        };
    },
    
    insertGuardText: function(text) {
        var field = this.window.down('#guardExpression');
        if (field) {
            var currentValue = field.getValue() || '';
            field.setValue(currentValue + text);
            field.focus();
        }
    },
    
    promptInsertRole: function() {
        var self = this;
        Ext.Msg.prompt(t('Custom Role'), t('Enter the role name (e.g., ROLE_MANAGER):'), function(btn, text) {
            if (btn === 'ok' && text) {
                var roleName = text.toUpperCase();
                if (!roleName.startsWith('ROLE_')) {
                    roleName = 'ROLE_' + roleName;
                }
                self.insertGuardText("is_granted('" + roleName + "')");
            }
        });
    },

    getNotificationTab: function () {
        var settings = this.transition.notificationSettings || [];
        var channelTypes = (this.config.notificationChannels || []).map(function (c) {
            return [c.type, c.label];
        });
        var rolesStore = (this.config.roles || []).map(function (r) {
            return [r.name, r.name];
        });
        var usersStore = (this.config.users || []).map(function (u) {
            return [u.id.toString(), u.name + (u.email ? ' (' + u.email + ')' : '')];
        });

        var notificationData = Array.isArray(settings) ? settings : [settings];

        var store = new Ext.data.Store({
            fields: ['channelType', 'notifyUsers', 'notifyRoles', 'mailType', 'mailPath'],
            data: notificationData.filter(function (n) { return n && Object.keys(n).length > 0; })
        });

        return {
            title: t('Notifications'),
            xtype: 'panel',
            layout: 'border',
            items: [
                {
                    region: 'north',
                    xtype: 'panel',
                    height: 80,
                    bodyPadding: 10,
                    html: '<div style="color: #666; font-size: 12px;">' +
                        '<strong>Notification Settings</strong><br>' +
                        'Configure who gets notified when this transition is executed. ' +
                        'You can send emails or Pimcore in-app notifications to specific users or roles.' +
                        '</div>'
                },
                {
                    region: 'center',
                    xtype: 'grid',
                    store: store,
                    plugins: {
                        ptype: 'cellediting',
                        clicksToEdit: 1
                    },
                    columns: [
                        {
                            text: t('Channel'),
                            dataIndex: 'channelType',
                            width: 140,
                            tooltip: 'Notification delivery method',
                            editor: {
                                xtype: 'combo',
                                store: channelTypes.length ? channelTypes : [
                                    ['mail', 'Email'],
                                    ['pimcore_notification', 'Pimcore Notification']
                                ]
                            },
                            renderer: function (value) {
                                var labels = {
                                    'mail': 'Email',
                                    'pimcore_notification': 'Pimcore Notification'
                                };
                                return labels[value] || value;
                            }
                        },
                        {
                            text: t('Users'),
                            dataIndex: 'notifyUsers',
                            flex: 1,
                            tooltip: 'Specific users to notify',
                            renderer: function (value) {
                                return Array.isArray(value) ? value.join(', ') : value;
                            }
                        },
                        {
                            text: t('Roles'),
                            dataIndex: 'notifyRoles',
                            flex: 1,
                            tooltip: 'All users with these roles will be notified',
                            renderer: function (value) {
                                return Array.isArray(value) ? value.join(', ') : value;
                            }
                        },
                        {
                            text: t('Mail Path'),
                            dataIndex: 'mailPath',
                            flex: 1,
                            tooltip: 'Email template path (for mail channel)',
                            editor: 'textfield'
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            items: [
                                {
                                    iconCls: 'pimcore_icon_edit',
                                    tooltip: 'Edit notification details',
                                    handler: function (grid, rowIndex) {
                                        this.editNotification(grid.getStore().getAt(rowIndex), usersStore, rolesStore, channelTypes);
                                    }.bind(this)
                                },
                                {
                                    iconCls: 'pimcore_icon_delete',
                                    tooltip: 'Remove notification',
                                    handler: function (grid, rowIndex) {
                                        grid.getStore().removeAt(rowIndex);
                                    }
                                }
                            ]
                        }
                    ],
                    tbar: [{
                        text: t('Add Notification'),
                        iconCls: 'pimcore_icon_add',
                        handler: function () {
                            store.add({
                                channelType: 'mail',
                                notifyUsers: [],
                                notifyRoles: [],
                                mailType: 'template',
                                mailPath: ''
                            });
                        }
                    }]
                }
            ]
        };
    },

    editNotification: function (record, usersStore, rolesStore, channelTypes) {
        new Ext.Window({
            title: t('Edit Notification'),
            width: 550,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                defaults: {
                    anchor: '100%',
                    labelWidth: 120
                },
                items: [
                    {
                        xtype: 'combo',
                        name: 'channelType',
                        fieldLabel: t('Channel'),
                        value: record.get('channelType'),
                        store: channelTypes.length ? channelTypes : [
                            ['mail', 'Email'],
                            ['pimcore_notification', 'Pimcore Notification']
                        ]
                    },
                    {
                        xtype: 'tagfield',
                        name: 'notifyUsers',
                        fieldLabel: t('Users'),
                        value: record.get('notifyUsers') || [],
                        store: usersStore,
                        queryMode: 'local'
                    },
                    {
                        xtype: 'tagfield',
                        name: 'notifyRoles',
                        fieldLabel: t('Roles'),
                        value: record.get('notifyRoles') || [],
                        store: rolesStore.length ? rolesStore : [
                            ['ROLE_ADMIN', 'ROLE_ADMIN'],
                            ['ROLE_EDITOR', 'ROLE_EDITOR'],
                            ['ROLE_REVIEWER', 'ROLE_REVIEWER']
                        ],
                        queryMode: 'local'
                    },
                    {
                        xtype: 'combo',
                        name: 'mailType',
                        fieldLabel: t('Mail Type'),
                        value: record.get('mailType') || 'template',
                        store: [['template', 'Twig Template'], ['document', 'Pimcore Document']]
                    },
                    {
                        xtype: 'textfield',
                        name: 'mailPath',
                        fieldLabel: t('Mail Path'),
                        value: record.get('mailPath') || '',
                        emptyText: 'e.g., @App/emails/workflow_notification.html.twig'
                    }
                ]
            }],
            buttons: [{
                text: t('Save'),
                handler: function (btn) {
                    var values = btn.up('window').down('form').getForm().getValues();
                    record.set(values);
                    btn.up('window').close();
                }
            }]
        }).show();
    },

    getNotesTab: function () {
        var notes = this.transition.notes || {};

        return {
            title: t('Notes'),
            xtype: 'form',
            bodyPadding: 10,
            scrollable: true,
            defaults: {
                anchor: '100%',
                labelWidth: 150
            },
            items: [
                {
                    xtype: 'panel',
                    border: false,
                    bodyPadding: '0 0 15 0',
                    html: '<div style="color: #666; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px;">' +
                        '<strong>Transition Notes</strong><br>' +
                        'Configure if users should provide comments/notes when executing this transition. ' +
                        'Useful for approval workflows where reviewers need to explain their decisions.' +
                        '</div>'
                },
                {
                    xtype: 'checkbox',
                    name: 'notes_commentEnabled',
                    fieldLabel: this.createLabelWithTooltip('Enable Comments',
                        'Show a comment field when executing this transition. ' +
                        'Users can optionally enter a note explaining their action.'),
                    checked: notes.commentEnabled === true
                },
                {
                    xtype: 'checkbox',
                    name: 'notes_commentRequired',
                    fieldLabel: this.createLabelWithTooltip('Comment Required',
                        'Make the comment mandatory. ' +
                        'Users cannot execute the transition without entering a comment. ' +
                        'Useful for rejections or important decisions.'),
                    checked: notes.commentRequired === true
                },
                {
                    xtype: 'textfield',
                    name: 'notes_title',
                    fieldLabel: this.createLabelWithTooltip('Dialog Title',
                        'Title shown in the comment dialog popup. ' +
                        'Customize to guide users on what to enter.'),
                    value: notes.title || '',
                    emptyText: 'e.g., Rejection Reason'
                },
                {
                    xtype: 'textfield',
                    name: 'notes_type',
                    fieldLabel: this.createLabelWithTooltip('Note Type',
                        'Category for the note entry in Pimcore\'s notes system. ' +
                        'Default is "workflow". Used for filtering and organization.'),
                    value: notes.type || 'workflow',
                    emptyText: 'workflow'
                },
                {
                    xtype: 'textfield',
                    name: 'notes_commentSetterFn',
                    fieldLabel: this.createLabelWithTooltip('Comment Setter',
                        'Optional: Method name on the object to store the comment. ' +
                        'The comment will be passed to this method. ' +
                        'Example: setLastWorkflowComment'),
                    value: notes.commentSetterFn || '',
                    emptyText: 'e.g., setLastWorkflowComment'
                },
                {
                    xtype: 'textfield',
                    name: 'notes_commentGetterFn',
                    fieldLabel: this.createLabelWithTooltip('Comment Getter',
                        'Optional: Method name to pre-fill the comment field. ' +
                        'The existing comment will be loaded from this method. ' +
                        'Example: getLastWorkflowComment'),
                    value: notes.commentGetterFn || '',
                    emptyText: 'e.g., getLastWorkflowComment'
                }
            ]
        };
    },

    getMetadataTab: function () {
        var metadataData = [];
        if (this.transition.metadata) {
            for (var key in this.transition.metadata) {
                metadataData.push({
                    key: key,
                    value: JSON.stringify(this.transition.metadata[key])
                });
            }
        }

        var store = new Ext.data.Store({
            fields: ['key', 'value'],
            data: metadataData
        });

        return {
            title: t('Metadata'),
            xtype: 'panel',
            layout: 'border',
            items: [
                {
                    region: 'north',
                    xtype: 'panel',
                    height: 80,
                    bodyPadding: 10,
                    html: '<div style="color: #666; font-size: 12px;">' +
                        '<strong>Custom Metadata</strong><br>' +
                        'Add custom key-value pairs to store additional information about this transition. ' +
                        'Metadata can be accessed in event listeners and custom logic. ' +
                        'Values can be strings, numbers, or JSON objects.' +
                        '</div>'
                },
                {
                    region: 'center',
                    xtype: 'grid',
                    store: store,
                    plugins: {
                        ptype: 'cellediting',
                        clicksToEdit: 1
                    },
                    columns: [
                        {
                            text: t('Key'),
                            dataIndex: 'key',
                            flex: 1,
                            editor: 'textfield'
                        },
                        {
                            text: t('Value'),
                            dataIndex: 'value',
                            flex: 2,
                            editor: 'textfield'
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 40,
                            items: [{
                                iconCls: 'pimcore_icon_delete',
                                tooltip: 'Remove metadata entry',
                                handler: function (grid, rowIndex) {
                                    grid.getStore().removeAt(rowIndex);
                                }
                            }]
                        }
                    ],
                    tbar: [{
                        text: t('Add Metadata'),
                        iconCls: 'pimcore_icon_add',
                        handler: function () {
                            store.add({key: '', value: ''});
                        }
                    }]
                }
            ]
        };
    },

    save: function () {
        var tabPanel = this.window.down('tabpanel');
        var generalForm = tabPanel.items.getAt(0);
        var guardForm = tabPanel.items.getAt(1);
        var notificationPanel = tabPanel.items.getAt(2);
        var notesForm = tabPanel.items.getAt(3);
        var metadataPanel = tabPanel.items.getAt(4);

        if (!generalForm.getForm().isValid()) {
            Ext.Msg.alert(t('Validation Error'), t('Please fill in all required fields correctly.'));
            return;
        }

        var data = generalForm.getForm().getValues();

        // Guard - now just a single expression string
        var guardValues = guardForm.getForm().getValues();
        var guardExpression = (guardValues.guard_expression || '').trim();
        
        // Store guard as expression string if not empty, otherwise empty object
        if (guardExpression) {
            data.guard = guardExpression;
        } else {
            data.guard = null;
        }

        // Notifications
        var notificationGrid = notificationPanel.down('grid');
        data.notificationSettings = [];
        notificationGrid.getStore().each(function (record) {
            data.notificationSettings.push(record.getData());
        });

        // Notes
        var notesValues = notesForm.getForm().getValues();
        data.notes = {};
        if (notesValues.notes_commentEnabled) {
            data.notes.commentEnabled = true;
        }
        if (notesValues.notes_commentRequired) {
            data.notes.commentRequired = true;
        }
        if (notesValues.notes_commentSetterFn) {
            data.notes.commentSetterFn = notesValues.notes_commentSetterFn;
        }
        if (notesValues.notes_commentGetterFn) {
            data.notes.commentGetterFn = notesValues.notes_commentGetterFn;
        }
        if (notesValues.notes_type) {
            data.notes.type = notesValues.notes_type;
        }
        if (notesValues.notes_title) {
            data.notes.title = notesValues.notes_title;
        }

        // Metadata
        var metadataGrid = metadataPanel.down('grid');
        data.metadata = {};
        metadataGrid.getStore().each(function (record) {
            var key = record.get('key');
            var value = record.get('value');
            if (key) {
                try {
                    data.metadata[key] = JSON.parse(value);
                } catch (e) {
                    data.metadata[key] = value;
                }
            }
        });

        if (this.callback) {
            this.callback(data);
        }

        this.window.close();
    }
});
