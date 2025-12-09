/**
 * Workflow Designer Pro - Simulation Panel
 * Interactive workflow simulation
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Simulation');

pimcore.plugin.WorkflowDesignerPro.Simulation = Class.create({
    initialize: function (options) {
        this.workflow = options.workflow;
        this.places = options.places || [];
        this.currentPlace = this.workflow.initialMarking;
        this.history = [];
    },

    show: function () {
        this.window = new Ext.Window({
            title: t('Workflow Simulation') + ': ' + this.workflow.name,
            width: 700,
            height: 500,
            modal: true,
            layout: 'border',
            items: [
                this.getControlPanel(),
                this.getHistoryPanel()
            ],
            buttons: [
                {
                    text: t('Reset'),
                    iconCls: 'pimcore_icon_reload',
                    handler: this.reset.bind(this)
                },
                {
                    text: t('Analyze'),
                    iconCls: 'pimcore_icon_search',
                    handler: this.analyze.bind(this)
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
        this.loadSimulation();
    },

    getControlPanel: function () {
        this.currentPlaceLabel = new Ext.form.field.Display({
            fieldLabel: t('Current Place'),
            value: '<span style="font-weight:bold;color:#3498db;">' + (this.currentPlace || 'None') + '</span>'
        });

        this.transitionCombo = new Ext.form.field.ComboBox({
            fieldLabel: t('Available Transitions'),
            store: new Ext.data.Store({
                fields: ['name', 'label', 'to']
            }),
            displayField: 'label',
            valueField: 'name',
            queryMode: 'local',
            editable: false,
            flex: 1,
            emptyText: t('Select a transition to apply')
        });

        return new Ext.Panel({
            region: 'north',
            height: 200,
            bodyPadding: 15,
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [
                {
                    xtype: 'displayfield',
                    value: '<h3 style="margin:0 0 10px 0;">Simulation Controls</h3>'
                },
                this.currentPlaceLabel,
                {
                    xtype: 'container',
                    layout: 'hbox',
                    margin: '10 0',
                    items: [
                        this.transitionCombo,
                        {
                            xtype: 'button',
                            text: t('Apply Transition'),
                            iconCls: 'pimcore_icon_arrow_right',
                            margin: '0 0 0 10',
                            handler: this.applyTransition.bind(this)
                        }
                    ]
                },
                {
                    xtype: 'displayfield',
                    itemId: 'transitionInfo',
                    value: ''
                }
            ]
        });
    },

    getHistoryPanel: function () {
        this.historyStore = new Ext.data.Store({
            fields: ['step', 'fromPlace', 'transition', 'toPlace', 'timestamp']
        });

        return new Ext.grid.Panel({
            region: 'center',
            title: t('Simulation History'),
            store: this.historyStore,
            columns: [
                {text: '#', dataIndex: 'step', width: 50},
                {text: t('From'), dataIndex: 'fromPlace', flex: 1},
                {text: t('Transition'), dataIndex: 'transition', flex: 1},
                {text: t('To'), dataIndex: 'toPlace', flex: 1},
                {text: t('Time'), dataIndex: 'timestamp', width: 150}
            ]
        });
    },

    loadSimulation: function () {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_simulate', {id: this.workflow.id}),
            method: 'POST',
            jsonData: {
                currentPlace: this.currentPlace
            },
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success) {
                    this.updateUI(result.simulation);
                }
            }.bind(this)
        });
    },

    updateUI: function (simulation) {
        this.currentPlace = simulation.currentPlace;
        this.currentPlaceLabel.setValue(
            '<span style="font-weight:bold;color:#3498db;font-size:16px;">' + 
            (this.currentPlace || 'None') + 
            '</span>'
        );

        // Update available transitions
        var store = this.transitionCombo.getStore();
        store.loadData(simulation.availableTransitions || []);

        if (simulation.availableTransitions && simulation.availableTransitions.length > 0) {
            this.transitionCombo.setEmptyText(t('Select a transition'));
        } else {
            this.transitionCombo.setEmptyText(t('No transitions available (end state)'));
        }

        // Update info
        var info = this.window.down('#transitionInfo');
        if (simulation.availableTransitions && simulation.availableTransitions.length > 0) {
            var transitionList = simulation.availableTransitions.map(function (t) {
                var guardInfo = t.hasGuard ? ' <span style="color:#e74c3c;">(guarded)</span>' : '';
                return '<li>' + t.label + ' → ' + t.to.join(', ') + guardInfo + '</li>';
            }).join('');
            info.setValue('<small><strong>Available transitions:</strong><ul>' + transitionList + '</ul></small>');
        } else {
            info.setValue('<small style="color:#27ae60;"><strong>✓ Final state reached</strong></small>');
        }

        if (simulation.error) {
            Ext.Msg.alert(t('Error'), simulation.error);
        }
    },

    applyTransition: function () {
        var transitionName = this.transitionCombo.getValue();
        if (!transitionName) {
            Ext.Msg.alert(t('Error'), t('Please select a transition'));
            return;
        }

        var fromPlace = this.currentPlace;

        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_simulate', {id: this.workflow.id}),
            method: 'POST',
            jsonData: {
                currentPlace: this.currentPlace,
                transition: transitionName
            },
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success && result.simulation.success) {
                    // Add to history
                    this.history.push({
                        step: this.history.length + 1,
                        fromPlace: fromPlace,
                        transition: result.simulation.appliedTransition.name,
                        toPlace: result.simulation.currentPlace,
                        timestamp: new Date().toLocaleTimeString()
                    });
                    this.historyStore.loadData(this.history);

                    this.transitionCombo.clearValue();
                    this.updateUI(result.simulation);
                } else {
                    Ext.Msg.alert(t('Error'), result.simulation.error || 'Transition failed');
                }
            }.bind(this)
        });
    },

    reset: function () {
        this.currentPlace = this.workflow.initialMarking;
        this.history = [];
        this.historyStore.removeAll();
        this.transitionCombo.clearValue();
        this.loadSimulation();
    },

    analyze: function () {
        Ext.Ajax.request({
            url: Routing.generate('workflow_designer_pro_admin_analyze', {id: this.workflow.id}),
            method: 'GET',
            success: function (response) {
                var result = Ext.decode(response.responseText);
                if (result.success) {
                    this.showAnalysisResults(result.analysis, result.paths);
                }
            }.bind(this)
        });
    },

    showAnalysisResults: function (analysis, paths) {
        var html = '<div style="padding:15px;">';
        
        html += '<h3>Reachability Analysis</h3>';
        html += '<p><strong>Reachable places:</strong> ' + analysis.reachable.join(', ') + '</p>';
        
        if (analysis.unreachable.length > 0) {
            html += '<p style="color:#e74c3c;"><strong>Unreachable places:</strong> ' + analysis.unreachable.join(', ') + '</p>';
        }
        
        html += '<p><strong>Dead ends (final states):</strong> ' + (analysis.deadEnds.length > 0 ? analysis.deadEnds.join(', ') : 'None') + '</p>';
        html += '<p><strong>Has cycles:</strong> ' + (analysis.hasCycles ? 'Yes' : 'No') + '</p>';

        html += '<h3>Possible Paths (first 10)</h3>';
        if (paths && paths.length > 0) {
            paths.slice(0, 10).forEach(function (path, idx) {
                var pathStr = path.map(function (step) {
                    var s = step.place;
                    if (step.transition) {
                        s += ' --(' + step.transition + ')-->';
                    }
                    if (step.cycle) {
                        s += ' <span style="color:#f39c12;">[cycle]</span>';
                    }
                    if (step.truncated) {
                        s += ' <span style="color:#e74c3c;">[max depth]</span>';
                    }
                    return s;
                }).join(' ');
                html += '<p style="font-family:monospace;font-size:11px;">' + (idx + 1) + '. ' + pathStr + '</p>';
            });
        } else {
            html += '<p>No paths found</p>';
        }

        html += '</div>';

        new Ext.Window({
            title: t('Workflow Analysis'),
            width: 700,
            height: 500,
            modal: true,
            autoScroll: true,
            html: html
        }).show();
    }
});

