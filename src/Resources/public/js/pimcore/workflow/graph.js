/**
 * Workflow Designer Pro - Graph Editor
 * Visual canvas-based workflow graph editor with connection ports and orthogonal routing
 */
pimcore.registerNS('pimcore.plugin.WorkflowDesignerPro.Graph');

pimcore.plugin.WorkflowDesignerPro.Graph = Class.create({
    // Port configuration
    PORT_RADIUS: 6,
    PORT_HIT_RADIUS: 12,
    PORT_POSITIONS: ['top', 'right', 'bottom', 'left'],
    
    // Orthogonal routing configuration
    ROUTE_MARGIN: 30,
    ROUTE_OFFSET_STEP: 15,
    
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
        
        // Connection dragging state
        this.connectingFrom = null;  // {placeName, port}
        this.connectingTo = null;    // {x, y} current mouse position
        this.hoveredPort = null;     // {placeName, port} for visual feedback
        
        // Track which place is being hovered for port visibility
        this.hoveredPlace = null;
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
            this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));

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

        // Draw transitions (arrows) with orthogonal routing
        this.drawAllTransitions();

        // Draw places
        for (var pName in this.places) {
            this.drawPlace(this.places[pName]);
        }
        
        // Draw connection ports on hovered place or all places when connecting
        this.drawConnectionPorts();
        
        // Draw rubber band connection line when dragging
        if (this.connectingFrom) {
            this.drawConnectionPreview();
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
    
    /**
     * Get the position of a connection port on a place
     */
    getPortPosition: function(place, port) {
        var cx = place.x + place.width / 2;
        var cy = place.y + place.height / 2;
        
        switch(port) {
            case 'top':
                return { x: cx, y: place.y };
            case 'right':
                return { x: place.x + place.width, y: cy };
            case 'bottom':
                return { x: cx, y: place.y + place.height };
            case 'left':
                return { x: place.x, y: cy };
        }
        return { x: cx, y: cy };
    },
    
    /**
     * Draw connection ports on places
     */
    drawConnectionPorts: function() {
        var ctx = this.ctx;
        var self = this;
        
        // Determine which places should show ports
        var showPortsFor = {};
        
        if (this.connectingFrom) {
            // When connecting, show ports on all places except the source
            for (var name in this.places) {
                if (name !== this.connectingFrom.placeName) {
                    showPortsFor[name] = true;
                }
            }
            // Also show the source port
            showPortsFor[this.connectingFrom.placeName] = true;
        } else if (this.hoveredPlace) {
            // When hovering, only show ports on hovered place
            showPortsFor[this.hoveredPlace] = true;
        }
        
        // Draw ports
        for (var placeName in showPortsFor) {
            var place = this.places[placeName];
            if (!place) continue;
            
            this.PORT_POSITIONS.forEach(function(port) {
                var pos = self.getPortPosition(place, port);
                var isHovered = self.hoveredPort && 
                    self.hoveredPort.placeName === placeName && 
                    self.hoveredPort.port === port;
                var isSource = self.connectingFrom && 
                    self.connectingFrom.placeName === placeName && 
                    self.connectingFrom.port === port;
                
                // Draw port circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, self.PORT_RADIUS, 0, Math.PI * 2);
                
                if (isSource) {
                    ctx.fillStyle = '#e74c3c';
                    ctx.strokeStyle = '#c0392b';
                } else if (isHovered) {
                    ctx.fillStyle = '#27ae60';
                    ctx.strokeStyle = '#1e8449';
                } else {
                    ctx.fillStyle = '#95a5a6';
                    ctx.strokeStyle = '#7f8c8d';
                }
                
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
    },
    
    /**
     * Draw the rubber band preview when connecting
     */
    drawConnectionPreview: function() {
        if (!this.connectingFrom || !this.connectingTo) return;
        
        var ctx = this.ctx;
        var fromPlace = this.places[this.connectingFrom.placeName];
        if (!fromPlace) return;
        
        var startPos = this.getPortPosition(fromPlace, this.connectingFrom.port);
        var endX = this.connectingTo.x;
        var endY = this.connectingTo.y;
        
        // If hovering over a valid port, snap to it
        if (this.hoveredPort && this.hoveredPort.placeName !== this.connectingFrom.placeName) {
            var targetPlace = this.places[this.hoveredPort.placeName];
            if (targetPlace) {
                var targetPos = this.getPortPosition(targetPlace, this.hoveredPort.port);
                endX = targetPos.x;
                endY = targetPos.y;
            }
        }
        
        // Draw dashed orthogonal preview line
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        
        var route = this.calculateOrthogonalRoute(startPos.x, startPos.y, endX, endY, 
            this.connectingFrom.port, this.hoveredPort ? this.hoveredPort.port : null);
        
        ctx.beginPath();
        ctx.moveTo(route[0].x, route[0].y);
        for (var i = 1; i < route.length; i++) {
            ctx.lineTo(route[i].x, route[i].y);
        }
        ctx.stroke();
        
        // Draw arrow head at end
        if (route.length >= 2) {
            var lastSeg = route[route.length - 1];
            var prevSeg = route[route.length - 2];
            var angle = Math.atan2(lastSeg.y - prevSeg.y, lastSeg.x - prevSeg.x);
            var headLen = 10;
            
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(lastSeg.x, lastSeg.y);
            ctx.lineTo(lastSeg.x - headLen * Math.cos(angle - Math.PI / 6), lastSeg.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(lastSeg.x - headLen * Math.cos(angle + Math.PI / 6), lastSeg.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = '#3498db';
            ctx.fill();
        }
        
        ctx.restore();
    },
    
    /**
     * Calculate orthogonal route between two points
     */
    calculateOrthogonalRoute: function(x1, y1, x2, y2, fromPort, toPort) {
        var route = [];
        var margin = this.ROUTE_MARGIN;
        
        route.push({ x: x1, y: y1 });
        
        // Determine exit direction from source
        var exitX = x1, exitY = y1;
        switch(fromPort) {
            case 'top':
                exitY = y1 - margin;
                break;
            case 'right':
                exitX = x1 + margin;
                break;
            case 'bottom':
                exitY = y1 + margin;
                break;
            case 'left':
                exitX = x1 - margin;
                break;
        }
        
        // Determine entry direction to target
        var entryX = x2, entryY = y2;
        switch(toPort) {
            case 'top':
                entryY = y2 - margin;
                break;
            case 'right':
                entryX = x2 + margin;
                break;
            case 'bottom':
                entryY = y2 + margin;
                break;
            case 'left':
                entryX = x2 - margin;
                break;
        }
        
        // Simple orthogonal routing based on relative positions
        if (fromPort === 'right' || fromPort === 'left') {
            // Horizontal exit
            route.push({ x: exitX, y: y1 });
            
            if (toPort === 'top' || toPort === 'bottom') {
                // Vertical entry - need two bends
                route.push({ x: exitX, y: entryY });
                route.push({ x: x2, y: entryY });
            } else {
                // Horizontal entry - need one or two bends
                var midY = (y1 + y2) / 2;
                route.push({ x: exitX, y: midY });
                route.push({ x: entryX, y: midY });
                route.push({ x: entryX, y: y2 });
            }
        } else {
            // Vertical exit
            route.push({ x: x1, y: exitY });
            
            if (toPort === 'left' || toPort === 'right') {
                // Horizontal entry - need two bends
                route.push({ x: entryX, y: exitY });
                route.push({ x: entryX, y: y2 });
            } else {
                // Vertical entry - need one or two bends
                var midX = (x1 + x2) / 2;
                route.push({ x: midX, y: exitY });
                route.push({ x: midX, y: entryY });
                route.push({ x: x2, y: entryY });
            }
        }
        
        route.push({ x: x2, y: y2 });
        
        // Clean up redundant points
        return this.simplifyRoute(route);
    },
    
    /**
     * Remove redundant points from route (points on same line)
     */
    simplifyRoute: function(route) {
        if (route.length <= 2) return route;
        
        var simplified = [route[0]];
        
        for (var i = 1; i < route.length - 1; i++) {
            var prev = simplified[simplified.length - 1];
            var curr = route[i];
            var next = route[i + 1];
            
            // Check if current point is on the same line as prev and next
            var sameX = prev.x === curr.x && curr.x === next.x;
            var sameY = prev.y === curr.y && curr.y === next.y;
            
            if (!sameX && !sameY) {
                simplified.push(curr);
            }
        }
        
        simplified.push(route[route.length - 1]);
        return simplified;
    },
    
    /**
     * Determine optimal ports for a transition between two places
     */
    determineOptimalPorts: function(fromPlace, toPlace) {
        var fromCenterX = fromPlace.x + fromPlace.width / 2;
        var fromCenterY = fromPlace.y + fromPlace.height / 2;
        var toCenterX = toPlace.x + toPlace.width / 2;
        var toCenterY = toPlace.y + toPlace.height / 2;
        
        var dx = toCenterX - fromCenterX;
        var dy = toCenterY - fromCenterY;
        
        var fromPort, toPort;
        
        // Determine based on relative position
        if (Math.abs(dx) > Math.abs(dy)) {
            // More horizontal than vertical
            if (dx > 0) {
                fromPort = 'right';
                toPort = 'left';
            } else {
                fromPort = 'left';
                toPort = 'right';
            }
        } else {
            // More vertical than horizontal
            if (dy > 0) {
                fromPort = 'bottom';
                toPort = 'top';
            } else {
                fromPort = 'top';
                toPort = 'bottom';
            }
        }
        
        return { fromPort: fromPort, toPort: toPort };
    },
    
    /**
     * Draw all transitions with orthogonal routing and smart label placement
     */
    drawAllTransitions: function() {
        var ctx = this.ctx;
        var self = this;
        
        // Group transitions by source-target pairs to handle offsets
        var transitionsByPair = {};
        
        for (var tName in this.transitions) {
            var transition = this.transitions[tName];
            var isSelected = this.selectedElement && 
                this.selectedElement.type === 'transition' && 
                this.selectedElement.name === transition.name;
            
            for (var i = 0; i < transition.from.length; i++) {
                var fromPlace = this.places[transition.from[i]];
                if (!fromPlace) continue;
                
                for (var j = 0; j < transition.to.length; j++) {
                    var toPlace = this.places[transition.to[j]];
                    if (!toPlace) continue;
                    
                    // Create a key for this pair
                    var pairKey = transition.from[i] + '->' + transition.to[j];
                    var reversePairKey = transition.to[j] + '->' + transition.from[i];
                    
                    if (!transitionsByPair[pairKey]) {
                        transitionsByPair[pairKey] = [];
                    }
                    
                    transitionsByPair[pairKey].push({
                        name: tName,
                        label: transition.label,
                        fromPlace: fromPlace,
                        toPlace: toPlace,
                        isSelected: isSelected,
                        hasReverse: !!transitionsByPair[reversePairKey]
                    });
                }
            }
        }
        
        // Draw each transition with offset for multiples between same places
        for (var pairKey in transitionsByPair) {
            var transitions = transitionsByPair[pairKey];
            var count = transitions.length;
            
            transitions.forEach(function(t, idx) {
                var offset = count > 1 ? (idx - (count - 1) / 2) * self.ROUTE_OFFSET_STEP : 0;
                self.drawOrthogonalTransition(t.fromPlace, t.toPlace, t.label, t.isSelected, offset);
            });
        }
    },
    
    /**
     * Draw a single transition with orthogonal routing
     */
    drawOrthogonalTransition: function(fromPlace, toPlace, label, isSelected, offset) {
        var ctx = this.ctx;
        
        // Determine optimal ports
        var ports = this.determineOptimalPorts(fromPlace, toPlace);
        var startPos = this.getPortPosition(fromPlace, ports.fromPort);
        var endPos = this.getPortPosition(toPlace, ports.toPort);
        
        // Calculate route
        var route = this.calculateOrthogonalRoute(
            startPos.x, startPos.y, 
            endPos.x, endPos.y, 
            ports.fromPort, ports.toPort
        );
        
        // Apply offset to middle segments for parallel routes
        if (offset !== 0 && route.length > 2) {
            route = this.applyRouteOffset(route, offset, ports.fromPort);
        }
        
        // Draw the route
        ctx.beginPath();
        ctx.moveTo(route[0].x, route[0].y);
        for (var i = 1; i < route.length; i++) {
            ctx.lineTo(route[i].x, route[i].y);
        }
        
        ctx.strokeStyle = isSelected ? '#e74c3c' : '#5d6d7e';
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.stroke();
        
        // Draw arrow head
        if (route.length >= 2) {
            var lastPt = route[route.length - 1];
            var prevPt = route[route.length - 2];
            var angle = Math.atan2(lastPt.y - prevPt.y, lastPt.x - prevPt.x);
            var headLen = 10;
            
            ctx.beginPath();
            ctx.moveTo(lastPt.x, lastPt.y);
            ctx.lineTo(lastPt.x - headLen * Math.cos(angle - Math.PI / 6), lastPt.y - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(lastPt.x - headLen * Math.cos(angle + Math.PI / 6), lastPt.y - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = isSelected ? '#e74c3c' : '#5d6d7e';
            ctx.fill();
        }
        
        // Draw label with background on the longest segment
        if (label) {
            this.drawTransitionLabel(route, label, isSelected);
        }
    },
    
    /**
     * Apply offset to route for parallel transitions
     */
    applyRouteOffset: function(route, offset, fromPort) {
        var newRoute = [];
        
        for (var i = 0; i < route.length; i++) {
            var pt = { x: route[i].x, y: route[i].y };
            
            // Skip first and last points (they're at the ports)
            if (i > 0 && i < route.length - 1) {
                // Determine if this is a horizontal or vertical segment
                var prev = route[i - 1];
                var isHorizontal = Math.abs(pt.y - prev.y) < 1;
                
                if (isHorizontal) {
                    pt.y += offset;
                } else {
                    pt.x += offset;
                }
            }
            
            newRoute.push(pt);
        }
        
        return newRoute;
    },
    
    /**
     * Draw transition label with background for readability
     */
    drawTransitionLabel: function(route, label, isSelected) {
        var ctx = this.ctx;
        
        // Find the longest segment to place the label
        var longestSeg = { length: 0, midX: 0, midY: 0, isHorizontal: true };
        
        for (var i = 1; i < route.length; i++) {
            var p1 = route[i - 1];
            var p2 = route[i];
            var dx = p2.x - p1.x;
            var dy = p2.y - p1.y;
            var len = Math.sqrt(dx * dx + dy * dy);
            
            if (len > longestSeg.length) {
                longestSeg = {
                    length: len,
                    midX: (p1.x + p2.x) / 2,
                    midY: (p1.y + p2.y) / 2,
                    isHorizontal: Math.abs(dx) > Math.abs(dy)
                };
            }
        }
        
        // Measure text
        ctx.font = '11px Arial';
        var metrics = ctx.measureText(label);
        var textWidth = metrics.width;
        var textHeight = 14;
        var padding = 4;
        
        var labelX = longestSeg.midX;
        var labelY = longestSeg.midY;
        
        // Offset label perpendicular to the segment
        if (longestSeg.isHorizontal) {
            labelY -= textHeight / 2 + 4;
        } else {
            labelX += 6;
        }
        
        // Draw background pill
        var bgX = labelX - textWidth / 2 - padding;
        var bgY = labelY - textHeight / 2 - padding / 2;
        var bgWidth = textWidth + padding * 2;
        var bgHeight = textHeight + padding;
        var bgRadius = 4;
        
        ctx.beginPath();
        ctx.moveTo(bgX + bgRadius, bgY);
        ctx.lineTo(bgX + bgWidth - bgRadius, bgY);
        ctx.arcTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + bgRadius, bgRadius);
        ctx.lineTo(bgX + bgWidth, bgY + bgHeight - bgRadius);
        ctx.arcTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - bgRadius, bgY + bgHeight, bgRadius);
        ctx.lineTo(bgX + bgRadius, bgY + bgHeight);
        ctx.arcTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - bgRadius, bgRadius);
        ctx.lineTo(bgX, bgY + bgRadius);
        ctx.arcTo(bgX, bgY, bgX + bgRadius, bgY, bgRadius);
        ctx.closePath();
        
        ctx.fillStyle = isSelected ? '#fdf2f2' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#e74c3c' : '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = isSelected ? '#c0392b' : '#2c3e50';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
    },

    onMouseDown: function (e) {
        var pos = this.getMousePos(e);
        
        // Check if clicking on a port
        var portHit = this.hitTestPort(pos.x, pos.y);
        if (portHit) {
            // Start connecting
            this.connectingFrom = portHit;
            this.connectingTo = { x: pos.x, y: pos.y };
            this.canvas.style.cursor = 'crosshair';
            this.render();
            return;
        }
        
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

        if (this.connectingFrom) {
            // Update connection endpoint
            this.connectingTo = { x: pos.x, y: pos.y };
            
            // Check for port hover (excluding source place)
            var portHit = this.hitTestPort(pos.x, pos.y);
            if (portHit && portHit.placeName !== this.connectingFrom.placeName) {
                this.hoveredPort = portHit;
                this.canvas.style.cursor = 'crosshair';
            } else {
                this.hoveredPort = null;
                this.canvas.style.cursor = 'crosshair';
            }
            
            this.render();
        } else if (this.dragging) {
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
            // Check for port hover
            var portHit = this.hitTestPort(pos.x, pos.y);
            if (portHit) {
                this.hoveredPort = portHit;
                this.hoveredPlace = portHit.placeName;
                this.canvas.style.cursor = 'crosshair';
                this.render();
                return;
            }
            
            this.hoveredPort = null;
            
            // Check for place hover (for showing ports)
            var element = this.hitTest(pos.x, pos.y);
            if (element && element.type === 'place') {
                if (this.hoveredPlace !== element.name) {
                    this.hoveredPlace = element.name;
                    this.render();
                }
                this.canvas.style.cursor = 'pointer';
            } else {
                if (this.hoveredPlace) {
                    this.hoveredPlace = null;
                    this.render();
                }
                this.canvas.style.cursor = element ? 'pointer' : 'default';
            }
        }
    },

    onMouseUp: function (e) {
        if (this.connectingFrom) {
            // Complete connection if over a valid target port
            if (this.hoveredPort && this.hoveredPort.placeName !== this.connectingFrom.placeName) {
                this.createTransitionFromConnection(
                    this.connectingFrom.placeName,
                    this.hoveredPort.placeName
                );
            }
            
            this.connectingFrom = null;
            this.connectingTo = null;
            this.hoveredPort = null;
            this.canvas.style.cursor = 'default';
            this.render();
            return;
        }
        
        if (this.dragging) {
            this.syncToEditor();
        }
        this.dragging = null;
        this.panning = null;
        this.canvas.style.cursor = 'default';
    },
    
    onMouseLeave: function(e) {
        // Cancel any in-progress connection
        if (this.connectingFrom) {
            this.connectingFrom = null;
            this.connectingTo = null;
            this.hoveredPort = null;
            this.canvas.style.cursor = 'default';
            this.render();
        }
        
        // Clear hover states
        if (this.hoveredPlace) {
            this.hoveredPlace = null;
            this.render();
        }
    },
    
    /**
     * Create a transition from a drag-and-drop connection
     */
    createTransitionFromConnection: function(fromPlaceName, toPlaceName) {
        var count = Object.keys(this.transitions).length + 1;
        var name = 'transition_' + count;
        
        while (this.transitions[name]) {
            count++;
            name = 'transition_' + count;
        }
        
        // Open dialog with pre-filled from/to
        new Ext.Window({
            title: t('Create Transition'),
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
                        xtype: 'displayfield',
                        fieldLabel: t('From'),
                        value: fromPlaceName
                    },
                    {
                        xtype: 'displayfield',
                        fieldLabel: t('To'),
                        value: toPlaceName
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
                    text: t('Create'),
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
                                from: [fromPlaceName],
                                to: [toPlaceName],
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
    
    /**
     * Hit test for connection ports
     */
    hitTestPort: function(x, y) {
        var self = this;
        
        for (var placeName in this.places) {
            var place = this.places[placeName];
            
            for (var i = 0; i < this.PORT_POSITIONS.length; i++) {
                var port = this.PORT_POSITIONS[i];
                var pos = this.getPortPosition(place, port);
                
                var dx = x - pos.x;
                var dy = y - pos.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist <= this.PORT_HIT_RADIUS) {
                    return { placeName: placeName, port: port };
                }
            }
        }
        
        return null;
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

        // Test transitions - check if click is near any transition route
        for (var tName in this.transitions) {
            var transition = this.transitions[tName];
            
            for (var i = 0; i < transition.from.length; i++) {
                var fromPlace = this.places[transition.from[i]];
                if (!fromPlace) continue;
                
                for (var j = 0; j < transition.to.length; j++) {
                    var toPlace = this.places[transition.to[j]];
                    if (!toPlace) continue;
                    
                    // Get the route for this transition
                    var ports = this.determineOptimalPorts(fromPlace, toPlace);
                    var startPos = this.getPortPosition(fromPlace, ports.fromPort);
                    var endPos = this.getPortPosition(toPlace, ports.toPort);
                    var route = this.calculateOrthogonalRoute(
                        startPos.x, startPos.y,
                        endPos.x, endPos.y,
                        ports.fromPort, ports.toPort
                    );
                    
                    // Check if click is near any segment of the route
                    for (var k = 1; k < route.length; k++) {
                        if (this.isPointNearSegment(x, y, route[k-1], route[k], 10)) {
                            return {type: 'transition', name: tName};
                        }
                    }
                }
            }
        }

        return null;
    },
    
    /**
     * Check if a point is near a line segment
     */
    isPointNearSegment: function(px, py, p1, p2, threshold) {
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
            return Math.sqrt((px - p1.x) * (px - p1.x) + (py - p1.y) * (py - p1.y)) <= threshold;
        }
        
        var t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (length * length)));
        var nearestX = p1.x + t * dx;
        var nearestY = p1.y + t * dy;
        
        var dist = Math.sqrt((px - nearestX) * (px - nearestX) + (py - nearestY) * (py - nearestY));
        return dist <= threshold;
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
        var spacing = 200;
        var rowHeight = 140;
        
        placeNames.forEach(function (name, idx) {
            var place = this.places[name];
            place.x = 100 + (idx % cols) * spacing;
            place.y = 100 + Math.floor(idx / cols) * rowHeight;
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
