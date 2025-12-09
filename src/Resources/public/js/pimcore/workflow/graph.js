/**
 * Workflow Designer Pro - Graph Editor
 * Visual canvas-based workflow graph editor
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Graph');

pimcore.plugin.WorkflowDesignerPro.Graph = Class.create({
    initialize: function (options) {
        this.workflow = options.workflow;
        this.editor = options.editor;
        this.config = options.config || {};
        this.places = {};
        this.transitions = {};
        this.selectedElement = null;
        this.dragging = null;
        this.canvas = null;
        this.ctx = null;
    },

    getPanel: function () {
        if (!this.panel) {
            // Store reference to graph for callbacks
            var graph = this;
            
            this.canvasComponent = new Ext.Component({
                xtype: 'component',
                autoEl: {
                    tag: 'canvas'
                },
                style: 'background: #f5f5f5; cursor: default; width: 100%; height: 100%;',
                listeners: {
                    afterrender: function(comp) {
                        graph.initCanvas(comp);
                    },
                    resize: function(comp) {
                        graph.resizeCanvas();
                    }
                }
            });
            
            this.panel = new Ext.Panel({
                layout: 'fit',
                border: false,
                items: [this.canvasComponent],
                tbar: this.getToolbar(),
                listeners: {
                    activate: function() {
                        // Re-render when tab becomes visible
                        Ext.defer(function() {
                            graph.resizeCanvas();
                        }, 50);
                    }
                }
            });
        }

        return this.panel;
    },

    getToolbar: function () {
        return {
            items: [
                {
                    text: t('Add Place'),
                    iconCls: 'pimcore_icon_add',
                    handler: this.addPlace.bind(this)
                },
                {
                    text: t('Add Transition'),
                    iconCls: 'pimcore_icon_arrow_right',
                    handler: this.addTransition.bind(this)
                },
                '-',
                {
                    text: t('Auto Layout'),
                    iconCls: 'pimcore_icon_grid',
                    handler: this.autoLayout.bind(this)
                },
                '-',
                {
                    text: t('Zoom In'),
                    iconCls: 'pimcore_icon_add',
                    handler: function () {
                        this.zoom *= 1.2;
                        this.render();
                    }.bind(this)
                },
                {
                    text: t('Zoom Out'),
                    iconCls: 'pimcore_icon_delete',
                    handler: function () {
                        this.zoom /= 1.2;
                        this.render();
                    }.bind(this)
                },
                {
                    text: t('Reset Zoom'),
                    handler: function () {
                        this.zoom = 1;
                        this.panX = 0;
                        this.panY = 0;
                        this.render();
                    }.bind(this)
                }
            ]
        };
    },

    initCanvas: function (component) {
        // Delay initialization to allow ExtJS layout to complete
        Ext.defer(function() {
            var canvasEl = component ? component.getEl().dom : null;
            
            if (!canvasEl) {
                console.warn('Canvas element not found');
                return;
            }

            this.canvas = canvasEl;
            this.ctx = this.canvas.getContext('2d');
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;

            // Initialize places and transitions from workflow
            this.loadFromWorkflow();

            // Set up event listeners
            this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
            this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
            this.canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
            this.canvas.addEventListener('wheel', this.onWheel.bind(this));
            this.canvas.addEventListener('contextmenu', this.onContextMenu.bind(this));

            this.resizeCanvas();
            this.render();
            
            console.log('Canvas initialized successfully');
        }, 200, this);
    },

    resizeCanvas: function () {
        if (!this.canvas) {
            // Try to get canvas from component
            if (this.canvasComponent && this.canvasComponent.getEl()) {
                this.canvas = this.canvasComponent.getEl().dom;
                this.ctx = this.canvas.getContext('2d');
            }
            if (!this.canvas) return;
        }
        
        var parent = this.canvas.parentElement;
        if (parent) {
            // Ensure minimum dimensions
            var width = Math.max(parent.clientWidth, 400);
            var height = Math.max(parent.clientHeight, 300);
            
            this.canvas.width = width;
            this.canvas.height = height;
            this.render();
        }
    },

    loadFromWorkflow: function () {
        this.places = {};
        this.transitions = {};

        var placeData = this.workflow.places || {};
        var idx = 0;
        
        // Handle both array and object formats
        if (Array.isArray(placeData)) {
            placeData.forEach(function(place) {
                var name = place.name;
                this.places[name] = {
                    name: name,
                    label: place.label || name,
                    color: place.color || '#3498db',
                    x: place.positionX || 150 + (idx % 4) * 200,
                    y: place.positionY || 100 + Math.floor(idx / 4) * 150,
                    width: 120,
                    height: 60,
                    data: place
                };
                idx++;
            }.bind(this));
        } else {
            for (var name in placeData) {
                var place = placeData[name];
                this.places[name] = {
                    name: name,
                    label: place.label || name,
                    color: place.color || '#3498db',
                    x: place.positionX || 150 + (idx % 4) * 200,
                    y: place.positionY || 100 + Math.floor(idx / 4) * 150,
                    width: 120,
                    height: 60,
                    data: place
                };
                idx++;
            }
        }

        var transitionData = this.workflow.transitions || {};
        
        // Handle both array and object formats
        if (Array.isArray(transitionData)) {
            transitionData.forEach(function(transition) {
                var tName = transition.name;
                this.transitions[tName] = {
                    name: tName,
                    label: transition.label || tName,
                    from: transition.from || [],
                    to: transition.to || [],
                    data: transition
                };
            }.bind(this));
        } else {
            for (var tName in transitionData) {
                var transition = transitionData[tName];
                this.transitions[tName] = {
                    name: tName,
                    label: transition.label || tName,
                    from: transition.from || [],
                    to: transition.to || [],
                    data: transition
                };
            }
        }
        
        console.log('Loaded workflow graph:', Object.keys(this.places).length, 'places,', Object.keys(this.transitions).length, 'transitions');
    },

    render: function () {
        if (!this.ctx) return;

        var ctx = this.ctx;
        var width = this.canvas.width;
        var height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        this.drawGrid();

        // Save context and apply transforms
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // Draw transitions (arrows)
        for (var tName in this.transitions) {
            this.drawTransition(this.transitions[tName]);
        }

        // Draw places
        for (var pName in this.places) {
            this.drawPlace(this.places[pName]);
        }

        ctx.restore();

        // Draw help text if no places
        if (Object.keys(this.places).length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Click "Add Place" to create your first workflow state', width / 2, height / 2 - 20);
            ctx.fillText('or right-click anywhere to add a place', width / 2, height / 2 + 10);
        }
    },

    drawGrid: function () {
        var ctx = this.ctx;
        var gridSize = 20 * this.zoom;
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;

        for (var x = (this.panX % gridSize); x < this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        for (var y = (this.panY % gridSize); y < this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    },

    drawPlace: function (place) {
        var ctx = this.ctx;
        var isSelected = this.selectedElement && this.selectedElement.type === 'place' && this.selectedElement.name === place.name;
        var isInitial = this.workflow.initialMarking === place.name;

        // Draw rounded rectangle
        var radius = 10;
        ctx.beginPath();
        ctx.moveTo(place.x + radius, place.y);
        ctx.lineTo(place.x + place.width - radius, place.y);
        ctx.arcTo(place.x + place.width, place.y, place.x + place.width, place.y + radius, radius);
        ctx.lineTo(place.x + place.width, place.y + place.height - radius);
        ctx.arcTo(place.x + place.width, place.y + place.height, place.x + place.width - radius, place.y + place.height, radius);
        ctx.lineTo(place.x + radius, place.y + place.height);
        ctx.arcTo(place.x, place.y + place.height, place.x, place.y + place.height - radius, radius);
        ctx.lineTo(place.x, place.y + radius);
        ctx.arcTo(place.x, place.y, place.x + radius, place.y, radius);
        ctx.closePath();

        // Fill
        ctx.fillStyle = place.color || '#3498db';
        ctx.fill();

        // Border
        ctx.strokeStyle = isSelected ? '#e74c3c' : (isInitial ? '#27ae60' : '#2980b9');
        ctx.lineWidth = isSelected || isInitial ? 3 : 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(place.label, place.x + place.width / 2, place.y + place.height / 2);

        // Initial marker
        if (isInitial) {
            ctx.beginPath();
            ctx.moveTo(place.x - 30, place.y + place.height / 2);
            ctx.lineTo(place.x - 5, place.y + place.height / 2);
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(place.x - 5, place.y + place.height / 2);
            ctx.lineTo(place.x - 12, place.y + place.height / 2 - 5);
            ctx.lineTo(place.x - 12, place.y + place.height / 2 + 5);
            ctx.closePath();
            ctx.fillStyle = '#27ae60';
            ctx.fill();
        }
    },

    drawTransition: function (transition) {
        var ctx = this.ctx;
        var isSelected = this.selectedElement && this.selectedElement.type === 'transition' && this.selectedElement.name === transition.name;

        // Draw arrows from each "from" place to each "to" place
        for (var i = 0; i < transition.from.length; i++) {
            var fromPlace = this.places[transition.from[i]];
            if (!fromPlace) continue;

            for (var j = 0; j < transition.to.length; j++) {
                var toPlace = this.places[transition.to[j]];
                if (!toPlace) continue;

                this.drawArrow(
                    fromPlace.x + fromPlace.width,
                    fromPlace.y + fromPlace.height / 2,
                    toPlace.x,
                    toPlace.y + toPlace.height / 2,
                    transition.label,
                    isSelected
                );
            }
        }
    },

    drawArrow: function (x1, y1, x2, y2, label, isSelected) {
        var ctx = this.ctx;
        var headLen = 12;
        var angle = Math.atan2(y2 - y1, x2 - x1);

        // Curved line for better visibility
        var midX = (x1 + x2) / 2;
        var midY = (y1 + y2) / 2 - 20;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = isSelected ? '#e74c3c' : '#7f8c8d';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = isSelected ? '#e74c3c' : '#7f8c8d';
        ctx.fill();

        // Label
        if (label) {
            ctx.fillStyle = '#333';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, midX, midY - 5);
        }
    },

    onMouseDown: function (e) {
        var pos = this.getMousePos(e);
        var element = this.hitTest(pos.x, pos.y);

        if (element) {
            this.selectedElement = element;
            if (element.type === 'place') {
                this.dragging = {
                    element: element,
                    offsetX: pos.x - this.places[element.name].x,
                    offsetY: pos.y - this.places[element.name].y
                };
                this.canvas.style.cursor = 'move';
            }
        } else {
            this.selectedElement = null;
            // Start panning
            this.panning = {
                startX: e.clientX - this.panX,
                startY: e.clientY - this.panY
            };
        }

        this.render();
    },

    onMouseMove: function (e) {
        var pos = this.getMousePos(e);

        if (this.dragging) {
            var place = this.places[this.dragging.element.name];
            place.x = pos.x - this.dragging.offsetX;
            place.y = pos.y - this.dragging.offsetY;
            this.render();
            this.editor.markDirty();
        } else if (this.panning) {
            this.panX = e.clientX - this.panning.startX;
            this.panY = e.clientY - this.panning.startY;
            this.render();
        } else {
            var element = this.hitTest(pos.x, pos.y);
            this.canvas.style.cursor = element ? 'pointer' : 'default';
        }
    },

    onMouseUp: function (e) {
        if (this.dragging) {
            this.syncToEditor();
        }
        this.dragging = null;
        this.panning = null;
        this.canvas.style.cursor = 'default';
    },

    onDoubleClick: function (e) {
        var pos = this.getMousePos(e);
        var element = this.hitTest(pos.x, pos.y);

        if (element) {
            if (element.type === 'place') {
                this.editPlace(element.name);
            } else if (element.type === 'transition') {
                this.editTransition(element.name);
            }
        }
    },

    onWheel: function (e) {
        e.preventDefault();
        var delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= delta;
        this.zoom = Math.max(0.2, Math.min(3, this.zoom));
        this.render();
    },

    onContextMenu: function (e) {
        e.preventDefault();
        var pos = this.getMousePos(e);
        var element = this.hitTest(pos.x, pos.y);

        var menu;
        if (element) {
            if (element.type === 'place') {
                menu = new Ext.menu.Menu({
                    items: [
                        {
                            text: t('Edit Place'),
                            iconCls: 'pimcore_icon_edit',
                            handler: function () {
                                this.editPlace(element.name);
                            }.bind(this)
                        },
                        {
                            text: t('Set as Initial'),
                            iconCls: 'pimcore_icon_arrow_right',
                            handler: function () {
                                this.workflow.initialMarking = element.name;
                                this.editor.propertiesPanel.down('[name=initialMarking]').setValue(element.name);
                                this.editor.markDirty();
                                this.render();
                            }.bind(this)
                        },
                        '-',
                        {
                            text: t('Delete'),
                            iconCls: 'pimcore_icon_delete',
                            handler: function () {
                                this.deletePlace(element.name);
                            }.bind(this)
                        }
                    ]
                });
            } else if (element.type === 'transition') {
                menu = new Ext.menu.Menu({
                    items: [
                        {
                            text: t('Edit Transition'),
                            iconCls: 'pimcore_icon_edit',
                            handler: function () {
                                this.editTransition(element.name);
                            }.bind(this)
                        },
                        '-',
                        {
                            text: t('Delete'),
                            iconCls: 'pimcore_icon_delete',
                            handler: function () {
                                this.deleteTransition(element.name);
                            }.bind(this)
                        }
                    ]
                });
            }
        } else {
            menu = new Ext.menu.Menu({
                items: [
                    {
                        text: t('Add Place Here'),
                        iconCls: 'pimcore_icon_add',
                        handler: function () {
                            this.addPlaceAt(pos.x, pos.y);
                        }.bind(this)
                    }
                ]
            });
        }

        if (menu) {
            menu.showAt([e.clientX, e.clientY]);
        }
    },

    getMousePos: function (e) {
        var rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.panX) / this.zoom,
            y: (e.clientY - rect.top - this.panY) / this.zoom
        };
    },

    hitTest: function (x, y) {
        // Test places
        for (var name in this.places) {
            var place = this.places[name];
            if (x >= place.x && x <= place.x + place.width &&
                y >= place.y && y <= place.y + place.height) {
                return {type: 'place', name: name};
            }
        }

        // Test transitions (simplified - just check label area)
        for (var tName in this.transitions) {
            var transition = this.transitions[tName];
            // Check if click is near any transition line
            for (var i = 0; i < transition.from.length; i++) {
                var fromPlace = this.places[transition.from[i]];
                if (!fromPlace) continue;
                
                for (var j = 0; j < transition.to.length; j++) {
                    var toPlace = this.places[transition.to[j]];
                    if (!toPlace) continue;
                    
                    var midX = (fromPlace.x + fromPlace.width + toPlace.x) / 2;
                    var midY = (fromPlace.y + fromPlace.height / 2 + toPlace.y + toPlace.height / 2) / 2 - 20;
                    
                    if (Math.abs(x - midX) < 40 && Math.abs(y - midY) < 20) {
                        return {type: 'transition', name: tName};
                    }
                }
            }
        }

        return null;
    },

    addPlace: function () {
        this.addPlaceAt(200 + Object.keys(this.places).length * 50, 150);
    },

    addPlaceAt: function (x, y) {
        var count = Object.keys(this.places).length + 1;
        var name = 'place_' + count;
        
        while (this.places[name]) {
            count++;
            name = 'place_' + count;
        }

        var color = this.config.colors && this.config.colors.length > 0 
            ? this.config.colors[(count - 1) % this.config.colors.length].value 
            : '#3498db';

        var placeData = {
            name: name,
            label: 'Place ' + count,
            title: '',
            color: color,
            colorInverted: [],
            visibleInHeader: true,
            permissions: [],
            metadata: [],
            positionX: x,
            positionY: y
        };

        this.places[name] = {
            name: name,
            label: placeData.label,
            color: color,
            x: x,
            y: y,
            width: 120,
            height: 60,
            data: placeData
        };

        this.syncToEditor();
        this.render();
    },

    addTransition: function () {
        var count = Object.keys(this.transitions).length + 1;
        var name = 'transition_' + count;
        
        while (this.transitions[name]) {
            count++;
            name = 'transition_' + count;
        }

        // Open dialog to select from/to places
        var placeNames = Object.keys(this.places);
        
        if (placeNames.length < 2) {
            Ext.Msg.alert(t('Error'), t('You need at least two places to create a transition'));
            return;
        }

        new Ext.Window({
            title: t('Add Transition'),
            width: 400,
            modal: true,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                items: [
                    {
                        xtype: 'textfield',
                        name: 'name',
                        fieldLabel: t('Name'),
                        value: name,
                        allowBlank: false,
                        regex: /^[a-z][a-z0-9_]*$/
                    },
                    {
                        xtype: 'textfield',
                        name: 'label',
                        fieldLabel: t('Label'),
                        value: 'Transition ' + count
                    },
                    {
                        xtype: 'tagfield',
                        name: 'from',
                        fieldLabel: t('From Places'),
                        store: placeNames,
                        queryMode: 'local'
                    },
                    {
                        xtype: 'tagfield',
                        name: 'to',
                        fieldLabel: t('To Places'),
                        store: placeNames,
                        queryMode: 'local'
                    }
                ]
            }],
            buttons: [
                {
                    text: t('Cancel'),
                    handler: function (btn) {
                        btn.up('window').close();
                    }
                },
                {
                    text: t('Add'),
                    handler: function (btn) {
                        var form = btn.up('window').down('form').getForm();
                        if (form.isValid()) {
                            var values = form.getValues();
                            
                            // Create complete transition data structure
                            var transitionData = {
                                name: values.name,
                                label: values.label || values.name,
                                iconClass: '',
                                objectLayout: '',
                                from: values.from || [],
                                to: values.to || [],
                                guard: [],
                                options: [],
                                notes: {},
                                notificationSettings: [],
                                changePublicationState: '',
                                metadata: []
                            };
                            
                            this.transitions[values.name] = {
                                name: values.name,
                                label: transitionData.label,
                                from: transitionData.from,
                                to: transitionData.to,
                                data: transitionData
                            };
                            this.syncToEditor();
                            this.render();
                            btn.up('window').close();
                        }
                    }.bind(this)
                }
            ]
        }).show();
    },

    editPlace: function (name) {
        var place = this.places[name];
        var oldName = name;
        var placeEditor = new pimcore.plugin.WorkflowDesignerPro.Place({
            place: place.data,
            config: this.config,
            callback: function (data) {
                var newName = data.name;
                
                // Update place data
                place.data = data;
                place.name = newName;
                place.label = data.label || newName;
                place.color = data.color || '#3498db';
                
                // If name changed, update the key in places object and all references
                if (oldName !== newName) {
                    // Remove old key and add new key
                    delete this.places[oldName];
                    this.places[newName] = place;
                    
                    // Update all transitions that reference the old name
                    for (var tName in this.transitions) {
                        var t = this.transitions[tName];
                        // Update 'from' references
                        if (t.from && t.from.indexOf(oldName) !== -1) {
                            t.from = t.from.map(function(f) {
                                return f === oldName ? newName : f;
                            });
                            if (t.data && t.data.from) {
                                t.data.from = t.from;
                            }
                        }
                        // Update 'to' references
                        if (t.to && t.to.indexOf(oldName) !== -1) {
                            t.to = t.to.map(function(f) {
                                return f === oldName ? newName : f;
                            });
                            if (t.data && t.data.to) {
                                t.data.to = t.to;
                            }
                        }
                    }
                    
                    // Update initial marking in the editor if it references the old name
                    if (this.editor && this.editor.propertiesPanel) {
                        var initialMarkingCombo = this.editor.propertiesPanel.down('[name=initialMarking]');
                        if (initialMarkingCombo && initialMarkingCombo.getValue() === oldName) {
                            initialMarkingCombo.setValue(newName);
                        }
                    }
                    
                    // Update workflow object's initial marking if it matches
                    if (this.workflow && this.workflow.initialMarking === oldName) {
                        this.workflow.initialMarking = newName;
                    }
                }
                
                this.syncToEditor();
                this.render();
            }.bind(this)
        });
        placeEditor.show();
    },

    editTransition: function (name) {
        var transition = this.transitions[name];
        var oldName = name;
        var transitionEditor = new pimcore.plugin.WorkflowDesignerPro.Transition({
            transition: transition.data,
            places: Object.keys(this.places).map(function (n) { return {name: n}; }),
            config: this.config,
            callback: function (data) {
                var newName = data.name;
                
                // Update transition data
                transition.data = data;
                transition.name = newName;
                transition.label = data.label || newName;
                transition.from = data.from || [];
                transition.to = data.to || [];
                
                // If name changed, update the key in transitions object
                if (oldName !== newName) {
                    delete this.transitions[oldName];
                    this.transitions[newName] = transition;
                }
                
                this.syncToEditor();
                this.render();
            }.bind(this)
        });
        transitionEditor.show();
    },

    deletePlace: function (name) {
        Ext.Msg.confirm(t('Delete'), t('Are you sure you want to delete this place?'), function (btn) {
            if (btn === 'yes') {
                delete this.places[name];
                
                // Remove from transitions
                for (var tName in this.transitions) {
                    var t = this.transitions[tName];
                    t.from = t.from.filter(function (p) { return p !== name; });
                    t.to = t.to.filter(function (p) { return p !== name; });
                }
                
                this.syncToEditor();
                this.render();
            }
        }.bind(this));
    },

    deleteTransition: function (name) {
        Ext.Msg.confirm(t('Delete'), t('Are you sure you want to delete this transition?'), function (btn) {
            if (btn === 'yes') {
                delete this.transitions[name];
                this.syncToEditor();
                this.render();
            }
        }.bind(this));
    },

    autoLayout: function () {
        var placeNames = Object.keys(this.places);
        var cols = Math.ceil(Math.sqrt(placeNames.length));
        var spacing = 180;
        
        placeNames.forEach(function (name, idx) {
            var place = this.places[name];
            place.x = 100 + (idx % cols) * spacing;
            place.y = 100 + Math.floor(idx / cols) * 120;
        }.bind(this));

        this.syncToEditor();
        this.render();
    },

    syncToEditor: function () {
        var places = [];
        for (var name in this.places) {
            var p = this.places[name];
            places.push(Object.assign({}, p.data, {
                name: name,
                positionX: p.x,
                positionY: p.y
            }));
        }

        var transitions = [];
        for (var tName in this.transitions) {
            transitions.push(Object.assign({}, this.transitions[tName].data, {
                name: tName,
                from: this.transitions[tName].from,
                to: this.transitions[tName].to
            }));
        }

        this.editor.refreshFromGraph(places, transitions);
    }
});

