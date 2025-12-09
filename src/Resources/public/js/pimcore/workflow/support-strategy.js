/**
 * Workflow Designer Pro - Support Strategy Configuration
 * Component for configuring workflow support strategies (Simple, Expression, Custom)
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.SupportStrategy');

pimcore.plugin.WorkflowDesignerPro.SupportStrategy = Class.create({
    
    initialize: function(options) {
        this.config = options.config || {};
        this.workflow = options.workflow || {};
        this.callback = options.callback;
        this.editor = options.editor;
        
        // Extract support strategy from workflow
        this.supportStrategy = this.workflow.supportStrategy || {
            type: 'simple',
            expression: null,
            service: null
        };
        
        // Ensure type is set
        if (!this.supportStrategy.type) {
            this.supportStrategy.type = 'simple';
        }
    },

    getPanel: function() {
        if (!this.panel) {
            this.panel = new Ext.form.FieldSet({
                title: t('Support Strategy'),
                collapsible: true,
                collapsed: false,
                layout: 'anchor',
                defaults: {
                    anchor: '100%'
                },
                items: [
                    this.getStrategyTypeSelector(),
                    this.getSimpleStrategyPanel(),
                    this.getExpressionStrategyPanel(),
                    this.getCustomStrategyPanel()
                ],
                listeners: {
                    afterrender: function() {
                        this.updatePanelVisibility();
                    }.bind(this)
                }
            });
        }
        return this.panel;
    },

    getStrategyTypeSelector: function() {
        return {
            xtype: 'radiogroup',
            fieldLabel: t('Strategy Type'),
            labelWidth: 120,
            columns: 3,
            items: [
                {
                    boxLabel: t('Simple (Class List)'),
                    name: 'supportStrategyType',
                    inputValue: 'simple',
                    checked: this.supportStrategy.type === 'simple'
                },
                {
                    boxLabel: t('Expression'),
                    name: 'supportStrategyType',
                    inputValue: 'expression',
                    checked: this.supportStrategy.type === 'expression'
                },
                {
                    boxLabel: t('Custom Service'),
                    name: 'supportStrategyType',
                    inputValue: 'custom',
                    checked: this.supportStrategy.type === 'custom'
                }
            ],
            listeners: {
                change: function(field, newValue) {
                    this.supportStrategy.type = newValue.supportStrategyType;
                    this.updatePanelVisibility();
                    this.notifyChange();
                }.bind(this)
            }
        };
    },

    getSimpleStrategyPanel: function() {
        this.simplePanel = new Ext.panel.Panel({
            itemId: 'simplePanel',
            border: false,
            padding: '10 0 0 0',
            layout: 'anchor',
            defaults: {
                anchor: '100%'
            },
            items: [
                {
                    xtype: 'tagfield',
                    itemId: 'supportsField',
                    fieldLabel: t('Supported Classes'),
                    labelWidth: 120,
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
                        change: function(field, newValue) {
                            this.workflow.supports = newValue;
                            this.notifyChange();
                        }.bind(this)
                    }
                },
                {
                    xtype: 'displayfield',
                    value: '<span style="color: #666; font-size: 11px;">' + 
                           t('Select one or more classes that this workflow applies to.') + 
                           '</span>'
                }
            ]
        });
        return this.simplePanel;
    },

    getExpressionStrategyPanel: function() {
        this.expressionPanel = new Ext.panel.Panel({
            itemId: 'expressionPanel',
            border: false,
            padding: '10 0 0 0',
            layout: 'anchor',
            defaults: {
                anchor: '100%'
            },
            items: [
                {
                    xtype: 'combo',
                    itemId: 'expressionClassField',
                    fieldLabel: t('Target Class'),
                    labelWidth: 120,
                    store: new Ext.data.Store({
                        fields: ['fullClass', 'name'],
                        data: this.config.classes || []
                    }),
                    displayField: 'name',
                    valueField: 'fullClass',
                    value: (this.workflow.supports && this.workflow.supports.length > 0) 
                           ? this.workflow.supports[0] 
                           : null,
                    queryMode: 'local',
                    editable: true,
                    forceSelection: false,
                    listeners: {
                        change: function(field, newValue) {
                            this.workflow.supports = newValue ? [newValue] : [];
                            this.notifyChange();
                        }.bind(this)
                    }
                },
                {
                    xtype: 'fieldcontainer',
                    layout: 'hbox',
                    fieldLabel: t('Expression'),
                    labelWidth: 120,
                    items: [
                        {
                            xtype: 'textarea',
                            itemId: 'expressionField',
                            flex: 1,
                            height: 80,
                            value: this.supportStrategy.expression || '',
                            emptyText: "subject.getPropertyName() == 'value'",
                            style: 'font-family: monospace; font-size: 12px;',
                            listeners: {
                                change: function(field, newValue) {
                                    this.supportStrategy.expression = newValue;
                                    this.notifyChange();
                                }.bind(this)
                            }
                        },
                        {
                            xtype: 'button',
                            iconCls: 'pimcore_icon_open',
                            tooltip: t('Insert Template'),
                            width: 30,
                            margin: '0 0 0 5',
                            handler: this.showTemplateMenu.bind(this)
                        }
                    ]
                },
                this.getExpressionHelpPanel()
            ]
        });
        return this.expressionPanel;
    },

    getExpressionHelpPanel: function() {
        return {
            xtype: 'panel',
            border: false,
            padding: '10 0 0 0',
            collapsible: true,
            collapsed: true,
            title: t('Expression Help & Autocomplete'),
            titleCollapse: true,
            items: [
                {
                    xtype: 'panel',
                    border: false,
                    html: this.buildExpressionHelpHtml()
                }
            ]
        };
    },

    buildExpressionHelpHtml: function() {
        var autocomplete = this.config.expressionAutocomplete || {
            methods: [],
            operators: [],
            logical: []
        };
        
        var html = '<div style="font-size: 11px; color: #555;">';
        
        // Methods
        html += '<div style="margin-bottom: 10px;">';
        html += '<strong>' + t('Available Methods') + ':</strong>';
        html += '<div style="margin-top: 5px; max-height: 150px; overflow-y: auto; background: #f5f5f5; padding: 8px; border-radius: 3px;">';
        
        (autocomplete.methods || []).forEach(function(method) {
            html += '<div style="margin-bottom: 4px;">';
            html += '<code style="background: #e8e8e8; padding: 2px 4px; border-radius: 2px; cursor: pointer;" ' +
                    'onclick="navigator.clipboard.writeText(\'' + method.value + '\')" title="' + t('Click to copy') + '">' + 
                    Ext.util.Format.htmlEncode(method.value) + '</code>';
            html += ' <span style="color: #888;">- ' + Ext.util.Format.htmlEncode(method.label) + '</span>';
            html += '</div>';
        });
        html += '</div></div>';
        
        // Operators
        html += '<div style="margin-bottom: 10px;">';
        html += '<strong>' + t('Operators') + ':</strong>';
        html += '<div style="margin-top: 5px;">';
        (autocomplete.operators || []).forEach(function(op) {
            html += '<span style="background: #e0f0e0; padding: 2px 6px; border-radius: 2px; margin-right: 5px; margin-bottom: 3px; display: inline-block;">' + 
                    Ext.util.Format.htmlEncode(op.value) + '</span>';
        });
        html += '</div></div>';
        
        // Logical
        html += '<div>';
        html += '<strong>' + t('Logical Operators') + ':</strong>';
        html += '<div style="margin-top: 5px;">';
        (autocomplete.logical || []).forEach(function(op) {
            html += '<span style="background: #f0e0e0; padding: 2px 6px; border-radius: 2px; margin-right: 5px;">' + 
                    Ext.util.Format.htmlEncode(op.value) + '</span>';
        });
        html += '</div></div>';
        
        html += '</div>';
        
        return html;
    },

    showTemplateMenu: function(button) {
        var templates = this.config.expressionTemplates || [];
        
        if (templates.length === 0) {
            Ext.Msg.alert(t('Info'), t('No expression templates available.'));
            return;
        }
        
        var menuItems = templates.map(function(template) {
            return {
                text: template.label,
                tooltip: template.description,
                handler: function() {
                    this.insertTemplate(template);
                }.bind(this)
            };
        }.bind(this));
        
        var menu = new Ext.menu.Menu({
            items: menuItems
        });
        
        menu.showBy(button);
    },

    insertTemplate: function(template) {
        var expressionField = this.expressionPanel.down('#expressionField');
        if (expressionField) {
            expressionField.setValue(template.expression);
            this.supportStrategy.expression = template.expression;
            this.notifyChange();
        }
    },

    getCustomStrategyPanel: function() {
        var serviceStore = new Ext.data.Store({
            fields: ['id', 'class', 'label'],
            data: this.config.supportStrategyServices || []
        });
        
        this.customPanel = new Ext.panel.Panel({
            itemId: 'customPanel',
            border: false,
            padding: '10 0 0 0',
            layout: 'anchor',
            defaults: {
                anchor: '100%'
            },
            items: [
                {
                    xtype: 'combo',
                    itemId: 'serviceField',
                    fieldLabel: t('Service Class'),
                    labelWidth: 120,
                    store: serviceStore,
                    displayField: 'label',
                    valueField: 'id',
                    value: this.supportStrategy.service || null,
                    queryMode: 'local',
                    editable: true,
                    forceSelection: false,
                    emptyText: 'App\\Workflow\\CustomSupportStrategy',
                    listConfig: {
                        getInnerTpl: function() {
                            return '<div>' +
                                   '<div style="font-weight: bold;">{label}</div>' +
                                   '<div style="font-size: 10px; color: #888;">{id}</div>' +
                                   '</div>';
                        }
                    },
                    listeners: {
                        change: function(field, newValue) {
                            this.supportStrategy.service = newValue;
                            this.notifyChange();
                        }.bind(this)
                    }
                },
                {
                    xtype: 'displayfield',
                    value: '<span style="color: #666; font-size: 11px;">' + 
                           t('Select a service implementing WorkflowSupportStrategyInterface or enter a custom class name.') + 
                           '</span>'
                },
                this.getCustomServiceHelpPanel()
            ]
        });
        return this.customPanel;
    },

    getCustomServiceHelpPanel: function() {
        var exampleCode = '<?php\n' +
            'namespace App\\Workflow;\n\n' +
            'use Symfony\\Component\\Workflow\\SupportStrategy\\WorkflowSupportStrategyInterface;\n' +
            'use Symfony\\Component\\Workflow\\WorkflowInterface;\n\n' +
            'class CustomSupportStrategy implements WorkflowSupportStrategyInterface\n' +
            '{\n' +
            '    public function supports(WorkflowInterface $workflow, object $subject): bool\n' +
            '    {\n' +
            '        if ($subject instanceof \\Pimcore\\Model\\DataObject\\Product) {\n' +
            '            return $subject->getProductType() === \'article\';\n' +
            '        }\n' +
            '        return false;\n' +
            '    }\n' +
            '}';
        
        return {
            xtype: 'panel',
            border: false,
            padding: '10 0 0 0',
            collapsible: true,
            collapsed: true,
            title: t('Example Implementation'),
            titleCollapse: true,
            items: [
                {
                    xtype: 'panel',
                    border: true,
                    bodyStyle: 'background: #f8f8f8; padding: 10px;',
                    html: '<pre style="margin: 0; font-size: 11px; white-space: pre-wrap; word-wrap: break-word;">' + 
                          Ext.util.Format.htmlEncode(exampleCode) + '</pre>'
                },
                {
                    xtype: 'displayfield',
                    padding: '10 0 0 0',
                    value: '<span style="color: #666; font-size: 11px;">' + 
                           t('Make sure the service is registered in your services.yaml and tagged with workflow.support_strategy.') + 
                           '</span>'
                }
            ]
        };
    },

    updatePanelVisibility: function() {
        var type = this.supportStrategy.type;
        
        if (this.simplePanel) {
            this.simplePanel.setVisible(type === 'simple');
        }
        if (this.expressionPanel) {
            this.expressionPanel.setVisible(type === 'expression');
        }
        if (this.customPanel) {
            this.customPanel.setVisible(type === 'custom');
        }
    },

    notifyChange: function() {
        if (this.callback) {
            this.callback(this.getData());
        }
        if (this.editor && this.editor.markDirty) {
            this.editor.markDirty();
        }
    },

    getData: function() {
        return {
            supports: this.workflow.supports || [],
            supportStrategy: {
                type: this.supportStrategy.type,
                expression: this.supportStrategy.expression,
                service: this.supportStrategy.service
            }
        };
    },

    setData: function(data) {
        if (data.supports) {
            this.workflow.supports = data.supports;
        }
        if (data.supportStrategy) {
            this.supportStrategy = data.supportStrategy;
        }
        
        // Update UI
        if (this.panel) {
            var supportsField = this.simplePanel.down('#supportsField');
            if (supportsField) {
                supportsField.setValue(this.workflow.supports);
            }
            
            var expressionClassField = this.expressionPanel.down('#expressionClassField');
            if (expressionClassField && this.workflow.supports && this.workflow.supports.length > 0) {
                expressionClassField.setValue(this.workflow.supports[0]);
            }
            
            var expressionField = this.expressionPanel.down('#expressionField');
            if (expressionField) {
                expressionField.setValue(this.supportStrategy.expression || '');
            }
            
            var serviceField = this.customPanel.down('#serviceField');
            if (serviceField) {
                serviceField.setValue(this.supportStrategy.service || '');
            }
            
            this.updatePanelVisibility();
        }
    }
});

