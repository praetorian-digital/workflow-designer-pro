/**
 * Workflow Designer Pro - Place Editor
 * Dialog for editing place properties
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Place');

pimcore.plugin.WorkflowDesignerPro.Place = Class.create({
    initialize: function (options) {
        this.place = options.place || {};
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
        var defaultColors = [
            {value: '#3498db', label: 'Blue'},
            {value: '#27ae60', label: 'Green'},
            {value: '#e74c3c', label: 'Red'},
            {value: '#f39c12', label: 'Orange'},
            {value: '#9b59b6', label: 'Purple'},
            {value: '#1abc9c', label: 'Teal'},
            {value: '#e67e22', label: 'Dark Orange'},
            {value: '#95a5a6', label: 'Gray'},
            {value: '#34495e', label: 'Dark Blue'},
            {value: '#16a085', label: 'Dark Teal'}
        ];
        
        var colorStore = new Ext.data.Store({
            fields: ['value', 'label'],
            data: this.config.colors || defaultColors
        });

        this.window = new Ext.Window({
            title: t('Edit Place') + ': ' + (this.place.name || t('New Place')),
            width: 900,
            height: 600,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'tabpanel',
                items: [
                    this.getGeneralTab(colorStore),
                    this.getPermissionsTab(),
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

    getGeneralTab: function (colorStore) {
        return {
            title: t('General'),
            xtype: 'form',
            bodyPadding: 10,
            scrollable: true,
            defaults: {
                anchor: '100%',
                labelWidth: 140
            },
            items: [
                {
                    xtype: 'fieldset',
                    title: t('Identification'),
                    defaults: { anchor: '100%', labelWidth: 120 },
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'name',
                            fieldLabel: this.createLabelWithTooltip('Name', 
                                'Technical identifier used in code and configuration. ' +
                                'Must be lowercase with underscores (e.g., pending_review). ' +
                                'Used in transitions and stored in database. Not shown to end users.'),
                            value: this.place.name || '',
                            allowBlank: false,
                            regex: /^[a-z][a-z0-9_]*$/,
                            regexText: t('Must be lowercase, start with letter, only letters, numbers, underscores'),
                            emptyText: 'e.g., pending_review'
                        },
                        {
                            xtype: 'textfield',
                            name: 'label',
                            fieldLabel: this.createLabelWithTooltip('Label',
                                'Human-readable name displayed in the Pimcore admin UI. ' +
                                'Shown in workflow buttons, state indicators, and action dialogs. ' +
                                'Can include spaces and proper capitalization.'),
                            value: this.place.label || '',
                            emptyText: 'e.g., Pending Review'
                        },
                        {
                            xtype: 'textfield',
                            name: 'title',
                            fieldLabel: this.createLabelWithTooltip('Title',
                                'Optional extended description shown as tooltip on hover. ' +
                                'Provides additional context about what this state means. ' +
                                'Can be left empty or set same as label if not needed.'),
                            value: this.place.title || '',
                            emptyText: 'e.g., Content is waiting for editorial review'
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: t('Appearance'),
                    defaults: { anchor: '100%', labelWidth: 120 },
                    items: [
                        {
                            xtype: 'combo',
                            name: 'color',
                            fieldLabel: this.createLabelWithTooltip('Color',
                                'Background color for this state in the workflow visualization. ' +
                                'Select from predefined colors or enter a custom hex color (e.g., #3498db). ' +
                                'Used in graph editor and state badges.'),
                            value: this.place.color || '',
                            store: colorStore,
                            valueField: 'value',
                            displayField: 'label',
                            editable: true,
                            emptyText: 'Select or enter hex color',
                            listConfig: {
                                getInnerTpl: function() {
                                    return '<div style="display:flex;align-items:center;padding:3px 0;">' +
                                        '<div style="background-color:{value};width:24px;height:24px;border-radius:4px;margin-right:10px;border:1px solid rgba(0,0,0,0.15);box-shadow:0 1px 2px rgba(0,0,0,0.1);"></div>' +
                                        '<span style="flex:1;">{label}</span>' +
                                        '<span style="color:#888;font-size:11px;">{value}</span></div>';
                                }
                            },
                            listeners: {
                                change: function (combo, value) {
                                    if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) {
                                        combo.setFieldStyle('background: linear-gradient(to right, ' + value + ' 0%, ' + value + ' 30px, white 30px); padding-left: 40px;');
                                    } else {
                                        combo.setFieldStyle('');
                                    }
                                },
                                afterrender: function(combo) {
                                    var value = combo.getValue();
                                    if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) {
                                        combo.setFieldStyle('background: linear-gradient(to right, ' + value + ' 0%, ' + value + ' 30px, white 30px); padding-left: 40px;');
                                    }
                                },
                                select: function(combo, record) {
                                    var value = record.get('value');
                                    combo.setFieldStyle('background: linear-gradient(to right, ' + value + ' 0%, ' + value + ' 30px, white 30px); padding-left: 40px;');
                                }
                            }
                        },
                        {
                            xtype: 'checkbox',
                            name: 'colorInverted',
                            fieldLabel: this.createLabelWithTooltip('Invert Color',
                                'If checked, uses light text on the colored background. ' +
                                'Enable for dark background colors to ensure text readability.'),
                            checked: this.place.colorInverted === true
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: t('Display Options'),
                    defaults: { anchor: '100%', labelWidth: 120 },
                    items: [
                        {
                            xtype: 'checkbox',
                            name: 'visibleInHeader',
                            fieldLabel: this.createLabelWithTooltip('Visible in Header',
                                'When enabled, the workflow state is shown in the object\'s header bar in admin. ' +
                                'Useful for important states that should be immediately visible. ' +
                                'Disable for intermediate or less important states.'),
                            checked: this.place.visibleInHeader !== false
                        }
                    ]
                }
            ]
        };
    },

    getPermissionsTab: function () {
        var self = this;
        
        // Convert permissions array (Pimcore format) to store data
        var permissionsData = [];
        if (this.place.permissions && Array.isArray(this.place.permissions)) {
            this.place.permissions.forEach(function(rule) {
                permissionsData.push({
                    condition: rule.condition || '',
                    modify: rule.modify === true,
                    save: rule.save === true,
                    publish: rule.publish === true,
                    unpublish: rule.unpublish === true,
                    delete: rule['delete'] === true,
                    rename: rule.rename === true,
                    view: rule.view === true,
                    settings: rule.settings === true,
                    versions: rule.versions === true,
                    properties: rule.properties === true,
                    objectLayout: rule.objectLayout || ''
                });
            });
        }

        var store = new Ext.data.Store({
            fields: ['condition', 'modify', 'save', 'publish', 'unpublish', 'delete', 'rename', 'view', 'settings', 'versions', 'properties', 'objectLayout'],
            data: permissionsData
        });

        return {
            title: t('Permissions'),
            xtype: 'panel',
            layout: 'border',
            items: [
                {
                    region: 'north',
                    xtype: 'panel',
                    height: 'auto',
                    bodyPadding: 10,
                    html: '<div style="color: #666; font-size: 12px; background: #f5f5f5; padding: 12px; border-radius: 4px;">' +
                        '<strong style="color: #333;">Place Permission Rules</strong><br><br>' +
                        'Define what actions users can perform when an object is in this state.<br>' +
                        'Each rule specifies a <strong>condition</strong> (Symfony expression) and which permissions apply when matched.<br>' +
                        'The <strong>first matching rule</strong> will be applied. Leave condition empty to match all users.' +
                        '</div>' +
                        '<div style="color: #666; font-size: 11px; background: #fffbea; padding: 10px; border-radius: 4px; margin-top: 10px; border-left: 3px solid #f0ad4e;">' +
                        '<strong>Permission Flags:</strong><br>' +
                        '• <code>modify</code> = shorthand for save + publish + unpublish + delete + rename<br>' +
                        '• <code>save</code>, <code>publish</code>, <code>unpublish</code>, <code>delete</code>, <code>rename</code> = individual actions<br>' +
                        '• <code>view</code>, <code>settings</code>, <code>versions</code>, <code>properties</code> = read/access permissions<br>' +
                        '• <code>objectLayout</code> = custom data object layout to use (optional)' +
                        '</div>'
                },
                {
                    region: 'center',
                    xtype: 'grid',
                    itemId: 'permissionsGrid',
                    store: store,
                    plugins: {
                        ptype: 'cellediting',
                        clicksToEdit: 1
                    },
                    columns: [
                        {
                            text: t('Condition'),
                            dataIndex: 'condition',
                            flex: 2,
                            tooltip: 'Symfony expression (e.g., is_granted("ROLE_EDITOR")). Leave empty to match all.',
                            editor: {
                                xtype: 'textfield',
                                emptyText: 'e.g., is_granted("ROLE_EDITOR")'
                            },
                            renderer: function(value) {
                                if (!value) {
                                    return '<span style="color: #999; font-style: italic;">(always applies)</span>';
                                }
                                return '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 2px;">' + Ext.String.htmlEncode(value) + '</code>';
                            }
                        },
                        {
                            text: 'modify',
                            dataIndex: 'modify',
                            xtype: 'checkcolumn',
                            width: 55,
                            tooltip: 'Shorthand: save + publish + unpublish + delete + rename'
                        },
                        {
                            text: 'save',
                            dataIndex: 'save',
                            xtype: 'checkcolumn',
                            width: 45,
                            tooltip: 'Allow saving the object'
                        },
                        {
                            text: 'publish',
                            dataIndex: 'publish',
                            xtype: 'checkcolumn',
                            width: 55,
                            tooltip: 'Allow publishing the object'
                        },
                        {
                            text: 'unpub',
                            dataIndex: 'unpublish',
                            xtype: 'checkcolumn',
                            width: 50,
                            tooltip: 'Allow unpublishing the object'
                        },
                        {
                            text: 'delete',
                            dataIndex: 'delete',
                            xtype: 'checkcolumn',
                            width: 50,
                            tooltip: 'Allow deleting the object'
                        },
                        {
                            text: 'rename',
                            dataIndex: 'rename',
                            xtype: 'checkcolumn',
                            width: 55,
                            tooltip: 'Allow renaming the object'
                        },
                        {
                            text: 'view',
                            dataIndex: 'view',
                            xtype: 'checkcolumn',
                            width: 45,
                            tooltip: 'Allow viewing the object'
                        },
                        {
                            text: 'settings',
                            dataIndex: 'settings',
                            xtype: 'checkcolumn',
                            width: 55,
                            tooltip: 'Allow accessing object settings'
                        },
                        {
                            text: 'versions',
                            dataIndex: 'versions',
                            xtype: 'checkcolumn',
                            width: 60,
                            tooltip: 'Allow accessing version history'
                        },
                        {
                            text: 'props',
                            dataIndex: 'properties',
                            xtype: 'checkcolumn',
                            width: 45,
                            tooltip: 'Allow editing properties'
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 40,
                            items: [{
                                iconCls: 'pimcore_icon_delete',
                                tooltip: 'Remove this permission rule',
                                handler: function (grid, rowIndex) {
                                    grid.getStore().removeAt(rowIndex);
                                }
                            }]
                        }
                    ],
                    tbar: [
                        {
                            text: t('Add Rule'),
                            iconCls: 'pimcore_icon_add',
                            handler: function (btn) {
                                store.add({
                                    condition: '',
                                    modify: false,
                                    save: true,
                                    publish: false,
                                    unpublish: false,
                                    'delete': false,
                                    rename: false,
                                    view: true,
                                    settings: false,
                                    versions: true,
                                    properties: false,
                                    objectLayout: ''
                                });
                            }
                        },
                        '-',
                        {
                            text: 'Insert Condition',
                            iconCls: 'pimcore_icon_operator',
                            menu: [
                                { text: 'Role: ROLE_PIMCORE_ADMIN', handler: function() { self.insertCondition("is_granted('ROLE_PIMCORE_ADMIN')"); }},
                                { text: 'Role: ROLE_EDITOR', handler: function() { self.insertCondition("is_granted('ROLE_EDITOR')"); }},
                                { text: 'Role: ROLE_REVIEWER', handler: function() { self.insertCondition("is_granted('ROLE_REVIEWER')"); }},
                                '-',
                                { text: 'User is Admin', handler: function() { self.insertCondition("user.isAdmin()"); }},
                                { text: 'User is Owner', handler: function() { self.insertCondition("subject.getProperty('owner') == user.getId()"); }},
                                '-',
                                { text: 'AND (combine)', handler: function() { self.insertCondition(" and "); }},
                                { text: 'OR (alternative)', handler: function() { self.insertCondition(" or "); }}
                            ]
                        },
                        '->',
                        {
                            text: 'Set Object Layout',
                            iconCls: 'pimcore_icon_layout',
                            handler: function() {
                                var grid = self.window.down('#permissionsGrid');
                                var selection = grid.getSelection();
                                if (selection.length === 0) {
                                    Ext.Msg.alert(t('Info'), t('Please select a permission rule first'));
                                    return;
                                }
                                Ext.Msg.prompt(t('Object Layout'), t('Enter the layout ID to use for this rule:'), function(btn, text) {
                                    if (btn === 'ok') {
                                        selection[0].set('objectLayout', text);
                                    }
                                }, self, false, selection[0].get('objectLayout') || '');
                            }
                        }
                    ],
                    bbar: {
                        xtype: 'panel',
                        bodyPadding: 8,
                        html: '<div style="font-size: 11px; color: #888;">' +
                            '<strong>Condition Examples:</strong> ' +
                            '<code>is_granted(\'ROLE_EDITOR\')</code> • ' +
                            '<code>user.isAdmin()</code> • ' +
                            '<code>is_granted(\'ROLE_A\') or is_granted(\'ROLE_B\')</code>' +
                            '</div>'
                    }
                }
            ]
        };
    },
    
    insertCondition: function(text) {
        var grid = this.window.down('#permissionsGrid');
        var selection = grid.getSelection();
        if (selection.length === 0) {
            Ext.Msg.alert(t('Info'), t('Please select a permission rule first, then use this button to insert condition text'));
            return;
        }
        var current = selection[0].get('condition') || '';
        selection[0].set('condition', current + text);
    },

    getMetadataTab: function () {
        var metadataData = [];
        if (this.place.metadata) {
            for (var key in this.place.metadata) {
                metadataData.push({
                    key: key,
                    value: JSON.stringify(this.place.metadata[key])
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
                        'Add custom key-value pairs to store additional information about this place. ' +
                        'Metadata can be accessed programmatically and used in custom logic. ' +
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
                                tooltip: 'Remove this metadata entry',
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
        var permissionsPanel = tabPanel.items.getAt(1);
        var metadataPanel = tabPanel.items.getAt(2);

        if (!generalForm.getForm().isValid()) {
            Ext.Msg.alert(t('Validation Error'), t('Please fill in all required fields correctly.'));
            return;
        }

        var data = generalForm.getForm().getValues();

        // Collect permissions from grid as array of rules (Pimcore format)
        var permissionsGrid = permissionsPanel.down('#permissionsGrid');
        data.permissions = [];
        permissionsGrid.getStore().each(function (record) {
            var rule = {};
            
            // Only include non-empty condition
            var condition = record.get('condition');
            if (condition && condition.trim()) {
                rule.condition = condition.trim();
            }
            
            // Explicitly include ALL permission flags (true or false) for clear configuration
            rule.modify = record.get('modify') === true;
            rule.save = record.get('save') === true;
            rule.publish = record.get('publish') === true;
            rule.unpublish = record.get('unpublish') === true;
            rule['delete'] = record.get('delete') === true;
            rule.rename = record.get('rename') === true;
            rule.view = record.get('view') === true;
            rule.settings = record.get('settings') === true;
            rule.versions = record.get('versions') === true;
            rule.properties = record.get('properties') === true;
            
            // Include objectLayout if set
            var objectLayout = record.get('objectLayout');
            if (objectLayout && objectLayout.trim()) {
                rule.objectLayout = objectLayout.trim();
            }
            
            data.permissions.push(rule);
        });

        // Collect metadata from grid
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

        // Preserve position data
        data.positionX = this.place.positionX;
        data.positionY = this.place.positionY;

        if (this.callback) {
            this.callback(data);
        }

        this.window.close();
    }
});
