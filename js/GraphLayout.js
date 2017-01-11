class GraphLayout {
    constructor() {
        this.isOpen = false;

        // references to dom elements
        this.drawing = document.getElementById('drawing');
        this.div = document.getElementById('graph') || 
                   document.createElement('div');
        this.div.id = "graph";
        document.body.appendChild(this.div);

        // dimensions & properties
        this.bounds = this.div.getBoundingClientRect();

        // d3 dom references
        this.svg = d3.select('#graph').append('svg')
                    .attr('width', this.bounds.width)
                    .attr('height', this.bounds.height);
        this.g = this.svg.append('g')
                    .attr('transform','translate(' + this.bounds.width/2 + ',' + this.bounds.height/2 + ')');
        this.links = this.g.append('g')
                    .attr('class','links');
        this.nodes = this.g.append('g')
                    .attr('class','nodes');

        // selected words to generate graph around
        this.words = [];
        this.distanceFromRoot = 30; // default value for max dist from root
        this.data = {
            flat: {},
            anchors: [],
            links: []
        };

        // force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('collision', d3.forceCollide(d => {
                return d.role === "link-anchor" ? 0 : 20;
            }))
            .force('charge', d3.forceManyBody()
                .strength(d => d.role === "link-anchor" ? 0 : -30)
                .distanceMax(100)
            )
            .force('center', d3.forceCenter( 0,0 ));
    }

    open() {
        this.isOpen = true;
        this.drawing.classList.add('split-left');
        this.div.classList.add('split-right');
        this.resize();
    }
    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.drawing.classList.remove('split-left');
            this.div.classList.remove('split-right');            
        }
    }
    resize() {
        this.bounds = this.div.getBoundingClientRect();
        this.svg
            .attr('width', this.bounds.width)
            .attr('height', this.bounds.height);

        this.g
            .attr('transform','translate(' + this.bounds.width/2 + ',' + this.bounds.height/2 + ')');

        if (!this.nodes.selectAll('.node-group').empty()) {
            this.updateGraph();
        }
    }
    graph(words) {
        if (this.words.length === words.length && 
            this.words.every((w,i) => words[i] === w)) { return; }
        else { this.words = words; }

        this.generateData();
        console.log('data', this.data);

        // draw nodes
        this.drawNodes();

        // draw links
        this.drawLinks();

        // set force simulation
        this.updateGraph();
    }

    generateData() {
        // flatten nodes/links within a given distance of selected words
        var d = this.data.flat = {};
        this.words.forEach(root => {
            var maxDepth = this.distanceFromRoot;
            function addToDataset(node,depth) {
                if (depth > maxDepth) { return; } // done
                if (d[node.id] && d[node.id].depth <= depth) { // skip
                    return;
                }

                if (node.type === "WORD") {
                    d[node.id] = {
                        id: node.id,
                        depth: depth,
                        data: node
                    }
                }
                else if (node.type === "LINK") {
                    d[node.id] = {
                        id: node.id,
                        depth: depth,
                        data: node
                    }
                    // recurse to start/endpoint
                    if (node.s) { addToDataset(node.s, depth + 1); }
                    if (node.e) { addToDataset(node.e, depth + 1); }
                }
                // recurse to adjacent links
                var links = [].concat( node.parentsL, node.parentsR );
                links.forEach(l => addToDataset(l, depth + 1));
            }
            addToDataset(root, 0);
        });

        // sort flat data into nodes and links
        var a = this.data.anchors = [];
        var l = this.data.links = [];

        for (var i in d) {
            if (d[i].data.type === "WORD") {
                d[i].role = "word";
                a.push(d[i]);
            }
            else {
                d[i].stops = [];
                d[i].role = "link";
                l.push(d[i]);
            }
        }

        // identify anchors (endpoints of links): can be words or other links
        function getAnchorPoint(node) {
            if (d[node.id]) {
                if (d[node.id].role === "word") {
                    return d[node.id];
                }
                else {
                    // create anchor point along link
                    var linkAnchor = {
                        id: node.id,
                        data: node,
                        role: "link-anchor",
                        link: d[node.id]
                    };
                    linkAnchor.link.stops.push(linkAnchor); // circular ref
                    a.push(linkAnchor);
                    return linkAnchor;
                }
            }
            else {
                // endpoint not in range of data
                var emptyNode = {
                    id: node.id,
                    data:node,
                    role: "nil"
                };
                a.push(emptyNode);
                return emptyNode;
            }            
        }

        l.forEach(link => {
            var s = link.data.s,
                e = link.data.e;

            link.source = getAnchorPoint(s);
            link.target = getAnchorPoint(e);
        });

        // evenly space stops on initialization
        l.forEach(link => {
            var tmax = link.stops.length + 1;
            link.stops.forEach((stop,i) => {
                stop.t = (i + 1)/tmax;
            })
        })
    }//end generateData()

    drawNodes() {

        // setup/pre-declared variables
        var colors = d3.scaleSequential(d3.interpolateMagma).clamp(true);
        var sim = this.simulation;
        var drag = d3.drag()
            .on('start', (d) => {
                if (!d3.event.active) {
                    sim.alphaTarget(0.3).restart();
                }
                d.fx = d.x,
                d.fy = d.y;
            })
            .on('drag', function(d) {
                if (d.role !== "link-anchor") {
                    d.fx += d3.event.dx,
                    d.fy += d3.event.dy;                        
                }
                else {
                    // get distance to source/target
                    var nsDx = d.link.source.x - d.x,
                        nsDy = d.link.source.y - d.y,
                        ntDx = d.link.target.x - d.x,
                        ntDy = d.link.target.y - d.y,

                        esDx = d.link.source.x - d3.event.x,
                        esDy = d.link.source.y - d3.event.y,
                        etDx = d.link.target.x - d3.event.x,
                        etDy = d.link.target.y - d3.event.y;

                    var nodeDistanceToSource = nsDx*nsDx + nsDy*nsDy,
                        nodeDistanceToTarget = ntDx*ntDx + ntDy*ntDy,
                        dragDistanceToSource = esDx*esDx + esDy*esDy,
                        dragDistanceToTarget = etDx*etDx + etDy*etDy;

                    var direction = 0;
                    if (dragDistanceToSource < nodeDistanceToSource) {
                        direction = -0.01;
                    }
                    else if (dragDistanceToTarget < nodeDistanceToTarget) {
                        direction = 0.01;
                    }
                    else {
                        direction = dragDistanceToSource<dragDistanceToTarget ?
                            -0.01 : 0.01;
                    }
                    d.t = Math.max(Math.min(d.t + direction, 0.9), 0.1);
                }
            })
            .on('end', (d) => {
                if (!d3.event.active) {
                    sim.alphaTarget(0);
                }
                if (d.role !== "link-anchor") {
                    d.fx = d.fy = null;
                }
            });

        // data entry/merge
        var nodeGroup = this.nodes.selectAll('.node-group')
            .data(this.data.anchors);

        nodeGroup.exit().remove();
        var nodeEnter = nodeGroup.enter().append('g')
            .attr('class','node-group')
            .attr("transform", () => {
                return 'translate(' + this.bounds.width/2 + ',' + this.bounds.height/2 + ')';
            });

        nodeEnter.append('circle')
            .attr('class','node');
        var label = nodeEnter.append('g')
            .attr('class','node-label')
            .attr('pointer-events','none')
            .attr('transform','translate(10,-5)');
        label.append('text')
            .style('font-size','0.8em')
            .attr('text-anchor','start');
        label.append('rect')
            .attr('rx',1)
            .attr('ry',1)
            .attr('fill', '#fafaea')
            .attr('stroke','#cacabc');

        nodeGroup = nodeGroup.merge(nodeEnter);
        nodeGroup
            .classed('node-word', d => d.role === 'word')
            .on('mouseover', (d) => {
                function mouseoverWord(word) {
                    // TODO: link back to word in "drawing" svg

                }
                if (d.role === "word") { mouseoverWord( d.data ); }
                console.log('moused over',d)
            })
            .on('mouseout', (d) => {
                function mouseoutWord(word) {

                }
            })
            .call(drag);

        // draw circle
        var node = nodeGroup.selectAll('.node')
            .data(d => [d])
            .attr('r',(d) => d.role === 'word' ? 7 : 4)
            .attr('stroke', 'rgba(0,0,0,0.2)')
            .attr('fill',(d) => {
                if (d.role !== 'word') {
                    return 'transparent';
                }
                else {
                    return colors((d.depth+2)/10);
                }
            });

        // draw text label
        label = nodeGroup.selectAll('.node-label')
            .raise()
            .data(d => [d]);

        label.select('text')
            .text(d => d.role === "word" ? d.data.val : '')
            .attr('x',5);
        label.select('rect')
            .style('display', d => d.role === "word" ? "block" : "none")
            .attr('width', function() {
                return this.parentNode.getElementsByTagName('text')[0].getBBox().width + 10;
            })
            .attr('height','1.5em')
            .attr('y','-1em')
            .lower();

        this.nodes.selectAll('.node-word').raise();
    }

    drawLinks() {
        var link = this.links.selectAll('.link')
            .data(this.data.links);

        link.enter().append('path')
            .attr('class','link')
            .attr('fill','none')
            .attr('stroke','rgba(0,0,0,0.8)')
            .attr('stroke-width',0.5)
        .merge(link)

        link.exit().remove();
    }

    updateGraph() {
        var node = this.nodes.selectAll('.node-group'),
            link = this.links.selectAll('.link');

        var margin = 10;
        var clampX = d3.scaleLinear()
                .domain([margin-this.bounds.width/2, this.bounds.width/2-margin])
                .range([margin-this.bounds.width/2, this.bounds.width/2-margin])
                .clamp(true),
            clampY = d3.scaleLinear()
                .domain([margin-this.bounds.height/2, this.bounds.height/2-margin])
                .range([margin-this.bounds.height/2, this.bounds.height/2-margin])
                .clamp(true);

        function tick() {
          node
            .datum(d => { 
                if (d.role === "link-anchor") {
                    // get position of link-anchor on line
                    var target = d.link.target,
                        source = d.link.source;

                    var dx = target.x - source.x,
                        dy = target.y - source.y,
                        dr = Math.sqrt( dx * dx + dy * dy);

                    if (dr === 0) { 
                        d.fx = target.x,
                        d.fy = target.y;
                        return d; 
                    }

                    var sin60 = Math.sqrt(3)/2;
                    var cx = source.x + dx * 0.5 - dy * sin60,
                        cy = source.y + dy * 0.5 + dx * sin60;

                    var acos = Math.acos( (source.x - cx)/dr ),
                        asin = Math.asin( (source.y - cy)/dr );

                    var theta = (asin < 0) ? -acos : acos;

                    d.fx = cx + dr*Math.cos(theta + Math.PI/3 * d.t),
                    d.fy = cy + dr*Math.sin(theta + Math.PI/3 * d.t);
                }
                else {
                    d.x = clampX(d.x);
                    d.y = clampY(d.y);
                }
                return d; 
            })
            .attr("transform", (d) => {
                return 'translate(' + d.x + ',' + d.y + ')';
            });

          link
            .attr('d', arrowPath);


          function arrowPath(d,i) {
            var target = d.target,
                source = d.source;

            var dx = target.x - source.x,
                dy = target.y - source.y,
                dr = Math.sqrt( dx * dx + dy * dy);

            // if (target.role === "link-anchor" || source.role === "link-anchor") {
            //     dr /= 2;
            // }

            return  "M" + source.x + "," + source.y +
                "A" + dr + "," + dr + " 0 0,1 " +
                target.x + "," + target.y;
          }
        }

        this.simulation
            .nodes(this.data.anchors)
            .on('tick', tick);

        // this.simulation.force('link').links(this.data.links);

        if (this.simulation.alpha() < 0.1) {
            this.simulation.alpha(0.3).restart();
        }
    }
}//end class GraphLayout
