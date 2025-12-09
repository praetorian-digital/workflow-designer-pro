/**
 * Workflow Designer Pro - Editor
 * The main workflow editor with tabbed interface
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Editor');

pimcore.plugin.WorkflowDesignerPro.Editor = Class.create({
    initialize: function (options) {
        this.id = options.id;
        this.workflow = options.workflow;
        this.config = options.config || {};
        this.parentPanel = options.panel;
        this.dirty = false;
    },

    getPanel: function () {
        if (!this.panel) {
            this.panel = new Ext.Panel({
                id: this.id,
                title: this.workflow.name,
                iconCls: 'pimcore_material_icon_workflow pimcore_material_icon',
                closable: true,
                layout: 'border',
                items: [
                    this.getPropertiesPanel(),
                    this.getEditorTabPanel()
                ],
                tbar: this.getToolbar(),
                listeners: {
                    beforeclose: function () {
                        if (this.dirty) {
                            Ext.Msg.confirm(t('Unsaved Changes'), t('You have unsaved changes. Close anyway?'), function (btn) {
                                if (btn === 'yes') {
                                    this.dirty = false;
                                    this.panel.close();
                                }
                            }.bind(this));
                            return false;
                        }
                        return true;
                    }.bind(this)
                }
            });
        }

        return this.panel;
    },

    getToolbar: function () {
        return {
            items: [
                {
                    text: t('Save'),
                    iconCls: 'pimcore_icon_save',
                    handler: this.save.bind(this)
                },
                '-',
                {
                    text: t('Validate'),
                    iconCls: 'pimcore_icon_search',
                    handler: this.validate.bind(this)
                },
                {
                    text: t('Preview YAML'),
                    iconCls: 'pimcore_icon_preview',
                    handler: this.previewYaml.bind(this)
                },
                '-',
                {
                    text: t('Publish'),
                    iconCls: 'pimcore_icon_publish',
                    handler: this.publish.bind(this)
                },
                '->',
                {
                    text: t('Versions'),
                    iconCls: 'pimcore_icon_versions',
                    handler: this.showVersions.bind(this)
                },
                {
                    text: t('Simulate'),
                    iconCls: 'pimcore_icon_workflow_action',
                    handler: this.simulate.bind(this)
                }
            ]
        };
    },

    getPropertiesPanel: function () {
        if (!this.propertiesPanel) {
            this.propertiesPanel = new Ext.form.Panel({
                region: 'north',
                height: 180,
                collapsible: true,
                title: t('Workflow Properties'),
                bodyPadding: 10,
                layout: 'column',
                defaults: {
                    columnWidth: 0.5,
                    padding: 5
                },
                items: [
                    {
                        xtype: 'textfield',
                        name: 'name',
                        fieldLabel: t('Name'),
                        value: this.workflow.name,
                        allowBlank: false,
                        regex: /^[a-z][a-z0-9_]*$/,
                        regexText: 'Must be lowercase, start with letter, only letters, numbers, underscores',
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'combo',
                        name: 'type',
                        fieldLabel: t('Type'),
                        value: this.workflow.type || 'workflow',
                        store: [['workflow', 'Workflow'], ['state_machine', 'State Machine']],
                        editable: false,
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'tagfield',
                        name: 'supports',
                        fieldLabel: t('Supported Classes'),
                        columnWidth: 1,
                        store: new Ext.data.Store({
                            fields: ['fullClass', 'name'],
                            data: this.config.classes || []
                        }),
                        displayField: 'name',
                        valueField: 'fullClass',
                        value: this.workflow.supports || [],
                        queryMode: 'local',
                        filterPickList: true,
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'combo',
                        name: 'initialMarking',
                        fieldLabel: t('Initial Place'),
                        value: this.workflow.initialMarking,
                        store: new Ext.data.Store({
                            fields: ['name'],
                            data: this.getPlacesList()
                        }),
                        displayField: 'name',
                        valueField: 'name',
                        queryMode: 'local',
                        editable: true,
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'combo',
                        name: 'markingStoreType',
                        fieldLabel: t('Marking Store'),
                        value: this.workflow.markingStore?.type || 'state_table',
                        store: [
                            ['state_table', 'State Table (Database)'],
                            ['method', 'Method (Property)'],
                            ['single_state', 'Single State']
                        ],
                        editable: false,
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'textfield',
                        name: 'markingStoreProperty',
                        fieldLabel: t('State Property'),
                        value: this.workflow.markingStore?.property || 'state',
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    },
                    {
                        xtype: 'checkbox',
                        name: 'auditTrailEnabled',
                        fieldLabel: t('Audit Trail'),
                        checked: this.workflow.auditTrailEnabled || false,
                        listeners: {
                            change: this.markDirty.bind(this)
                        }
                    }
                ]
            });
        }

        return this.propertiesPanel;
    },

    getEditorTabPanel: function () {
        if (!this.editorTabPanel) {
            this.graphPanel = new pimcore.plugin.WorkflowDesignerPro.Graph({
                workflow: this.workflow,
                editor: this,
                config: this.config
            });

            this.placesPanel = this.createPlacesGrid();
            this.transitionsPanel = this.createTransitionsGrid();

            var graphTab = {
                title: t('Graph Editor'),
                iconCls: 'pimcore_material_icon_workflow pimcore_material_icon pimcore_material_icon_inverted',
                layout: 'fit',
                items: [this.graphPanel.getPanel()],
                listeners: {
                    activate: function() {
                        // Resize canvas when tab is activated
                        Ext.defer(function() {
                            if (this.graphPanel) {
                                this.graphPanel.resizeCanvas();
                            }
                        }, 100, this);
                    }.bind(this)
                }
            };

            this.editorTabPanel = new Ext.TabPanel({
                region: 'center',
                activeTab: 0,
                deferredRender: false,
                items: [
                    graphTab,
                    {
                        title: t('Places'),
                        iconCls: 'pimcore_icon_object',
                        layout: 'fit',
                        items: [this.placesPanel]
                    },
                    {
                        title: t('Transitions'),
                        iconCls: 'pimcore_icon_arrow_right',
                        layout: 'fit',
                        items: [this.transitionsPanel]
                    }
                ]
            });
        }

        return this.editorTabPanel;
    },

    createPlacesGrid: function () {
        var self = this;
        var store = new Ext.data.Store({
            fields: ['name', 'label', 'title', 'color', 'visibleInHeader', 'permissions', 'metadata', 'positionX', 'positionY'],
            data: Object.values(this.workflow.places || {}),
            listeners: {
                update: function(store, record, operation, modifiedFieldNames) {
                    self.markDirty();
                    self.updatePlacesStore();
                }
            }
        });

        var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 2,
            listeners: {
                beforeedit: function(editor, context) {
                    // Store the old name before editing
                    if (context.field === 'name') {
                        context.record._oldName = context.record.get('name');
                    }
                },
                edit: function(editor, context) {
                    // Handle name change - update all references
                    if (context.field === 'name' && context.record._oldName) {
                        var oldName = context.record._oldName;
                        var newName = context.value;
                        
                        if (oldName !== newName && newName) {
                            self.handlePlaceRename(oldName, newName);
                        }
                        delete context.record._oldName;
                    }
                    self.markDirty();
                }
            }
        });

        return new Ext.grid.Panel({
            store: store,
            plugins: [cellEditing],
            columns: [
                {
                    text: t('Name'),
                    dataIndex: 'name',
                    flex: 1,
                    editor: {
                        xtype: 'textfield',
                        allowBlank: false,
                        regex: /^[a-z][a-z0-9_]*$/
                    }
                },
                {
                    text: t('Label'),
                    dataIndex: 'label',
                    flex: 1,
                    editor: 'textfield'
                },
                {
                    text: t('Color'),
                    dataIndex: 'color',
                    width: 120,
                    renderer: function (value) {
                        if (value) {
                            return '<div style="display:flex;align-items:center;">' +
                                '<div style="background-color:' + value + ';width:20px;height:20px;border-radius:3px;margin-right:8px;border:1px solid rgba(0,0,0,0.1);"></div>' +
                                '<span>' + value + '</span></div>';
                        }
                        return '';
                    },
                    editor: {
                        xtype: 'combo',
                        store: new Ext.data.Store({
                            fields: ['value', 'label'],
                            data: (this.config.colors || [
                                {value: '#3498db', label: 'Blue'},
                                {value: '#27ae60', label: 'Green'},
                                {value: '#e74c3c', label: 'Red'},
                                {value: '#f39c12', label: 'Orange'},
                                {value: '#9b59b6', label: 'Purple'},
                                {value: '#1abc9c', label: 'Teal'},
                                {value: '#e67e22', label: 'Dark Orange'},
                                {value: '#95a5a6', label: 'Gray'}
                            ])
                        }),
                        valueField: 'value',
                        displayField: 'label',
                        editable: true,
                        listConfig: {
                            getInnerTpl: function() {
                                return '<div style="display:flex;align-items:center;">' +
                                    '<div style="background-color:{value};width:20px;height:20px;border-radius:3px;margin-right:8px;border:1px solid rgba(0,0,0,0.1);"></div>' +
                                    '<span>{label}</span></div>';
                            }
                        },
                        listeners: {
                            select: function(combo, record) {
                                // Show color preview in the field
                                combo.setFieldStyle('background: linear-gradient(to right, ' + record.get('value') + ' 0%, ' + record.get('value') + ' 25px, white 25px);');
                            }
                        }
                    }
                },
                {
                    text: t('Visible'),
                    dataIndex: 'visibleInHeader',
                    width: 70,
                    xtype: 'checkcolumn',
                    listeners: {
                        checkchange: function(column, rowIndex, checked) {
                            self.markDirty();
                        }
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 80,
                    items: [
                        {
                            iconCls: 'pimcore_icon_edit',
                            tooltip: t('Edit'),
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
                                this.editPlace(record);
                            }.bind(this)
                        },
                        {
                            iconCls: 'pimcore_icon_delete',
                            tooltip: t('Delete'),
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
                                var placeName = record.get('name');
                                
                                grid.getStore().removeAt(rowIndex);
                                
                                // Sync with graph - remove place
                                if (this.graphPanel && this.graphPanel.places) {
                                    delete this.graphPanel.places[placeName];
                                    
                                    // Also remove from transitions
                                    for (var tName in this.graphPanel.transitions) {
                                        var t = this.graphPanel.transitions[tName];
                                        if (t.from) {
                                            t.from = t.from.filter(function(f) { return f !== placeName; });
                                        }
                                        if (t.to) {
                                            t.to = t.to.filter(function(f) { return f !== placeName; });
                                        }
                                    }
                                    
                                    this.graphPanel.render();
                                }
                                
                                this.updatePlacesStore();
                                this.markDirty();
                            }.bind(this)
                        }
                    ]
                }
            ],
            tbar: [
                {
                    text: t('Add Place'),
                    iconCls: 'pimcore_icon_add',
                    handler: function () {
                        var count = store.getCount();
                        var placeName = 'place_' + (count + 1);
                        
                        // Ensure unique name
                        while (store.findRecord('name', placeName)) {
                            count++;
                            placeName = 'place_' + (count + 1);
                        }
                        
                        var placeData = {
                            name: placeName,
                            label: 'Place ' + (count + 1),
                            visibleInHeader: true,
                            color: '#3498db',
                            positionX: 100 + (count * 50),
                            positionY: 100 + (count * 30)
                        };
                        
                        store.add(placeData);
                        
                        // Sync with graph - add place
                        if (this.graphPanel) {
                            this.graphPanel.places[placeName] = {
                                name: placeName,
                                label: placeData.label,
                                color: placeData.color,
                                x: placeData.positionX,
                                y: placeData.positionY,
                                width: 120,
                                height: 60,
                                data: placeData
                            };
                            this.graphPanel.render();
                        }
                        
                        this.updatePlacesStore();
                        this.markDirty();
                    }.bind(this)
                }
            ],
            listeners: {
                edit: this.markDirty.bind(this)
            }
        });
    },

    createTransitionsGrid: function () {
        var self = this;
        var store = new Ext.data.Store({
            fields: ['name', 'label', 'from', 'to', 'iconClass', 'guard', 'notificationSettings', 'changePublicationState'],
            data: Object.values(this.workflow.transitions || {}),
            listeners: {
                update: function(store, record, operation, modifiedFieldNames) {
                    self.markDirty();
                }
            }
        });

        var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            clicksToEdit: 2,
            listeners: {
                edit: function(editor, context) {
                    self.markDirty();
                }
            }
        });

        return new Ext.grid.Panel({
            store: store,
            plugins: [cellEditing],
            columns: [
                {
                    text: t('Name'),
                    dataIndex: 'name',
                    width: 150,
                    editor: {
                        xtype: 'textfield',
                        allowBlank: false,
                        regex: /^[a-z][a-z0-9_]*$/
                    }
                },
                {
                    text: t('Label'),
                    dataIndex: 'label',
                    width: 150,
                    editor: 'textfield'
                },
                {
                    text: t('From'),
                    dataIndex: 'from',
                    flex: 1,
                    renderer: function (value) {
                        return Array.isArray(value) ? value.join(', ') : value;
                    }
                },
                {
                    text: t('To'),
                    dataIndex: 'to',
                    flex: 1,
                    renderer: function (value) {
                        return Array.isArray(value) ? value.join(', ') : value;
                    }
                },
                {
                    text: t('Guard'),
                    dataIndex: 'guard',
                    width: 80,
                    renderer: function (value) {
                        if (value && (value.expression || (value.roles && value.roles.length) || (value.permissions && value.permissions.length))) {
                            return '<span class="pimcore_icon_lock" style="display:inline-block;width:16px;height:16px;"></span>';
                        }
                        return '';
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 80,
                    items: [
                        {
                            iconCls: 'pimcore_icon_edit',
                            tooltip: t('Edit'),
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
                                this.editTransition(record);
                            }.bind(this)
                        },
                        {
                            iconCls: 'pimcore_icon_delete',
                            tooltip: t('Delete'),
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
                                var transitionName = record.get('name');
                                
                                grid.getStore().removeAt(rowIndex);
                                
                                // Sync with graph - remove transition
                                if (this.graphPanel && this.graphPanel.transitions) {
                                    delete this.graphPanel.transitions[transitionName];
                                    this.graphPanel.render();
                                }
                                
                                this.markDirty();
                            }.bind(this)
                        }
                    ]
                }
            ],
            tbar: [
                {
                    text: t('Add Transition'),
                    iconCls: 'pimcore_icon_add',
                    handler: function () {
                        var count = store.getCount();
                        var transitionName = 'transition_' + (count + 1);
                        
                        // Ensure unique name
                        while (store.findRecord('name', transitionName)) {
                            count++;
                            transitionName = 'transition_' + (count + 1);
                        }
                        
                        var transitionData = {
                            name: transitionName,
                            label: 'Transition ' + (count + 1),
                            from: [],
                            to: []
                        };
                        
                        store.add(transitionData);
                        
                        // Sync with graph - add transition
                        if (this.graphPanel) {
                            this.graphPanel.transitions[transitionName] = {
                                name: transitionName,
                                label: transitionData.label,
                                from: [],
                                to: [],
                                data: transitionData
                            };
                            this.graphPanel.render();
                        }
                        
                        this.markDirty();
                    }.bind(this)
                }
            ],
            listeners: {
                edit: this.markDirty.bind(this)
            }
        });
    },

    getPlacesList: function () {
        var places = this.workflow.places || {};
        return Object.keys(places).map(function (name) {
            return {name: name};
        });
    },

    markDirty: function () {
        this.dirty = true;
        if (!this.panel.title.endsWith('*')) {
            this.panel.setTitle(this.panel.title + ' *');
        }
    },

    markClean: function () {
        this.dirty = false;
        this.panel.setTitle(this.workflow.name);
    },

    editPlace: function (record) {
        var oldName = record.get('name');
        var placeEditor = new pimcore.plugin.WorkflowDesignerPro.Place({
            place: record.getData(),
            config: this.config,
            callback: function (data) {
                var newName = data.name;
                
                // If name changed, update all references
                if (oldName !== newName) {
                    // Update transitions that reference this place
                    this.transitionsPanel.getStore().each(function (transRecord) {
                        var transData = transRecord.getData();
                        var modified = false;
                        
                        // Update 'from' references
                        if (transData.from && transData.from.indexOf(oldName) !== -1) {
                            transData.from = transData.from.map(function(f) {
                                return f === oldName ? newName : f;
                            });
                            modified = true;
                        }
                        
                        // Update 'to' references
                        if (transData.to && transData.to.indexOf(oldName) !== -1) {
                            transData.to = transData.to.map(function(t) {
                                return t === oldName ? newName : t;
                            });
                            modified = true;
                        }
                        
                        if (modified) {
                            transRecord.set(transData);
                        }
                    });
                    
                    // Update initial marking if it references the old name
                    var initialMarkingCombo = this.propertiesPanel.down('[name=initialMarking]');
                    if (initialMarkingCombo && initialMarkingCombo.getValue() === oldName) {
                        initialMarkingCombo.setValue(newName);
                    }
                    
                    // Also update the graph if available
                    if (this.graphPanel && this.graphPanel.places && this.graphPanel.places[oldName]) {
                        var place = this.graphPanel.places[oldName];
                        delete this.graphPanel.places[oldName];
                        place.name = newName;
                        this.graphPanel.places[newName] = place;
                        
                        // Update transitions in graph
                        for (var tName in this.graphPanel.transitions) {
                            var t = this.graphPanel.transitions[tName];
                            if (t.from) {
                                t.from = t.from.map(function(f) { return f === oldName ? newName : f; });
                            }
                            if (t.to) {
                                t.to = t.to.map(function(f) { return f === oldName ? newName : f; });
                            }
                        }
                    }
                }
                
                record.set(data);
                this.updatePlacesStore();
                this.markDirty();
            }.bind(this)
        });
        placeEditor.show();
    },

    editTransition: function (record) {
        var transitionEditor = new pimcore.plugin.WorkflowDesignerPro.Transition({
            transition: record.getData(),
            places: this.getPlacesList(),
            config: this.config,
            callback: function (data) {
                record.set(data);
                this.markDirty();
            }.bind(this)
        });
        transitionEditor.show();
    },

    collectWorkflowData: function () {
        var formData = this.propertiesPanel.getForm().getValues();
        
        var places = {};
        this.placesPanel.getStore().each(function (record) {
            var data = record.getData();
            places[data.name] = data;
        });

        var transitions = {};
        this.transitionsPanel.getStore().each(function (record) {
            var data = record.getData();
            transitions[data.name] = data;
        });

        return {
            name: formData.name,
            type: formData.type,
            supports: formData.supports || [],
            initialMarking: formData.initialMarking,
            markingStore: {
                type: formData.markingStoreType,
                property: formData.markingStoreProperty
            },
            auditTrailEnabled: formData.auditTrailEnabled,
            places: Object.values(places),
            transitions: Object.values(transitions),
            globalActions: this.workflow.globalActions || [],
            metadata: this.workflow.metadata || {}
        };
    },

    save: function () {
        var data = this.collectWorkflowData();

        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_save', {id: this.workflow.id}),
            method: 'PUT',
            jsonData: data,
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success) {
                    this.workflow = result.data;
                    this.markClean();
                    pimcore.helpers.showNotification(t('Success'), result.message, 'success');
                    
                    if (result.validation && result.validation.length > 0) {
                        this.showValidationResults(result.validation);
                    }
                    
                    if (this.parentPanel) {
                        this.parentPanel.refreshList();
                    }
                } else {
                    Ext.Msg.alert(t('Error'), result.message);
                }
            }.bind(this),
            failure: function (response) {
                var result = Ext.decode(response.responseText);
                Ext.Msg.alert(t('Error'), result.message || 'Save failed');
            }
        });
    },

    validate: function () {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_validate', {id: this.workflow.id}),
            method: 'POST',
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success) {
                    this.showValidationResults(result.results);
                }
            }.bind(this)
        });
    },

    showValidationResults: function (results) {
        var html = '<div style="padding: 10px;">';
        
        var errors = results.filter(function (r) { return r.type === 'error'; });
        var warnings = results.filter(function (r) { return r.type === 'warning'; });
        var info = results.filter(function (r) { return r.type === 'info'; });

        if (errors.length > 0) {
            html += '<h3 style="color: #e74c3c;">Errors (' + errors.length + ')</h3><ul>';
            errors.forEach(function (e) {
                html += '<li>' + Ext.util.Format.htmlEncode(e.message) + '</li>';
            });
            html += '</ul>';
        }

        if (warnings.length > 0) {
            html += '<h3 style="color: #f39c12;">Warnings (' + warnings.length + ')</h3><ul>';
            warnings.forEach(function (w) {
                html += '<li>' + Ext.util.Format.htmlEncode(w.message) + '</li>';
            });
            html += '</ul>';
        }

        if (info.length > 0) {
            html += '<h3 style="color: #3498db;">Info (' + info.length + ')</h3><ul>';
            info.forEach(function (i) {
                html += '<li>' + Ext.util.Format.htmlEncode(i.message) + '</li>';
            });
            html += '</ul>';
        }

        if (results.length === 0) {
            html += '<p style="color: #27ae60;"><strong>✓ Workflow is valid</strong></p>';
        }

        html += '</div>';

        new Ext.Window({
            title: t('Validation Results'),
            width: 500,
            height: 400,
            modal: true,
            autoScroll: true,
            html: html
        }).show();
    },

    previewYaml: function () {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_preview', {id: this.workflow.id}),
            method: 'GET',
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success) {
                    new Ext.Window({
                        title: t('YAML Preview'),
                        width: 700,
                        height: 600,
                        modal: true,
                        layout: 'fit',
                        items: [{
                            xtype: 'textarea',
                            value: result.yaml,
                            readOnly: true,
                            style: 'font-family: monospace; font-size: 12px;'
                        }],
                        buttons: [{
                            text: t('Copy'),
                            handler: function () {
                                navigator.clipboard.writeText(result.yaml);
                                pimcore.helpers.showNotification(t('Success'), 'Copied to clipboard', 'success');
                            }
                        }]
                    }).show();
                }
            }.bind(this)
        });
    },

    publish: function () {
        Ext.Msg.confirm(t('Publish'), t('Are you sure you want to publish this workflow?'), function (btn) {
            if (btn === 'yes') {
                // Save first
                this.save();
                
                Ext.Ajax.request({
                    url: Routing.generate('workflow_designer_pro_admin_publish', {id: this.workflow.id}),
                    method: 'POST',
                    success: function (response) {
                        var result = Ext.decode(response.responseText);
                        if (result.success) {
                            pimcore.helpers.showNotification(t('Success'), result.message, 'success');
                            if (this.parentPanel) {
                                this.parentPanel.refreshList();
                            }
                        } else {
                            Ext.Msg.alert(t('Error'), result.message);
                        }
                    }.bind(this)
                });
            }
        }.bind(this));
    },

    showVersions: function () {
        var versionsPanel = new pimcore.plugin.WorkflowDesignerPro.Versions({
            workflowId: this.workflow.id,
            editor: this
        });
        versionsPanel.show();
    },

    simulate: function () {
        var simulationPanel = new pimcore.plugin.WorkflowDesignerPro.Simulation({
            workflow: this.workflow,
            places: this.getPlacesList()
        });
        simulationPanel.show();
    },

    /**
     * Handle place rename - update all references to the old name
     */
    handlePlaceRename: function(oldName, newName) {
        // Update transitions that reference this place
        this.transitionsPanel.getStore().each(function (transRecord) {
            var modified = false;
            
            // Update 'from' references
            var from = transRecord.get('from');
            if (from && from.indexOf(oldName) !== -1) {
                from = from.map(function(f) {
                    return f === oldName ? newName : f;
                });
                transRecord.set('from', from);
                modified = true;
            }
            
            // Update 'to' references
            var to = transRecord.get('to');
            if (to && to.indexOf(oldName) !== -1) {
                to = to.map(function(t) {
                    return t === oldName ? newName : t;
                });
                transRecord.set('to', to);
                modified = true;
            }
        });
        
        // Update initial marking if it references the old name
        var initialMarkingCombo = this.propertiesPanel.down('[name=initialMarking]');
        if (initialMarkingCombo && initialMarkingCombo.getValue() === oldName) {
            initialMarkingCombo.setValue(newName);
        }
        
        // Update graph panel if available
        if (this.graphPanel && this.graphPanel.places && this.graphPanel.places[oldName]) {
            var place = this.graphPanel.places[oldName];
            delete this.graphPanel.places[oldName];
            place.name = newName;
            if (place.data) {
                place.data.name = newName;
            }
            this.graphPanel.places[newName] = place;
            
            // Update transitions in graph
            for (var tName in this.graphPanel.transitions) {
                var t = this.graphPanel.transitions[tName];
                if (t.from) {
                    t.from = t.from.map(function(f) { return f === oldName ? newName : f; });
                    if (t.data && t.data.from) {
                        t.data.from = t.from;
                    }
                }
                if (t.to) {
                    t.to = t.to.map(function(f) { return f === oldName ? newName : f; });
                    if (t.data && t.data.to) {
                        t.data.to = t.to;
                    }
                }
            }
            
            this.graphPanel.render();
        }
        
        this.updatePlacesStore();
    },

    updatePlacesStore: function () {
        var combo = this.propertiesPanel.down('[name=initialMarking]');
        if (combo) {
            combo.getStore().loadData(this.getPlacesList());
        }
    },

    refreshFromGraph: function (places, transitions) {
        // Update stores from graph changes
        this.placesPanel.getStore().loadData(places);
        this.transitionsPanel.getStore().loadData(transitions);
        this.updatePlacesStore();
        this.markDirty();
    }
});

