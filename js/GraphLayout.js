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
        this.links = this.svg.append('g')
                        .attr('class','links');
        this.nodes = this.svg.append('g')
                        .attr('class','nodes');

        // selected words to generate graph around
        this.words = [];
        this.distanceFromRoot = 3; // default value for max dist from root
        this.data = {
            flat: {},
            anchors: [],
            links: []
        };

        // force simulation
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id))
            .force('collision', d3.forceCollide(20))
            .force('charge', d3.forceManyBody())
            .force('center', d3.forceCenter( 
                this.bounds.width/2, this.bounds.height/2 
            ));
    }

    open() {
        this.isOpen = true;
        this.drawing.classList.add('split-left');
        this.div.classList.add('split-right');
    }
    close() {
        if (this.isOpen) {
            this.isOpen = false;
            this.drawing.classList.remove('split-left');
            this.div.classList.remove('split-right');            
        }
    }
    graph(words) {
        if (words === this.words) { return; }
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
        var node = this.nodes.selectAll('.node')
            .data(this.data.anchors);

        node.enter().append('circle')
            .attr('class', 'node')
            .attr('r',() => Math.random()*20+4)
            .attr("transform", () => {
                return 'translate(' + this.bounds.width/2 + ',' + this.bounds.height/2 + ')';
            })
            .attr('fill',() => ['blue','red','black','white','green'][Math.floor(Math.random()*5)])
        .merge(node)

        node.exit().remove();
    }

    drawLinks() {
        var link = this.links.selectAll('.link')
            .data(this.data.links);

        link.enter().append('line') // path
            .attr('class','link')
            .attr('fill','none')
            .attr('stroke','black')
            .attr('stroke-width',2)
        .merge(link)

        link.exit().remove();
    }

    updateGraph() {
        this.bounds = this.div.getBoundingClientRect();

        var margin = 10;
        var clampX = d3.scaleLinear()
                .domain([margin, this.bounds.width-margin])
                .range([margin, this.bounds.width-margin])
                .clamp(true),
            clampY = d3.scaleLinear()
                .domain([margin, this.bounds.height-margin])
                .range([margin, this.bounds.height-margin])
                .clamp(true);

        var node = this.nodes.selectAll('.node'),
            link = this.links.selectAll('.link');

        function tick() {
          node
            .datum(d => { d.x = clampX(d.x), d.y = clampY(d.y); return d; })
            .attr("transform", function(d) { 
                return 'translate(' + d.x + ',' + d.y + ')';
            })

          link
            .attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        }

        this.simulation
            .force('center', d3.forceCenter( this.bounds.width/2, this.bounds.height/2 ))
            .nodes(this.data.anchors)
            .on('tick', tick);

        if (this.simulation.alpha() < 0.1) {
            this.simulation.alpha(0.3).restart();
        }
    }
}//end class GraphLayout
