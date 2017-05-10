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
        this.maxDepth = 30; // default value for max dist from root
        this.data = {
            flat: {},
            anchors: [],
            links: []
        };

        // force simulation
        this.simulation = d3.forceSimulation()
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

        return;

        // draw nodes
        this.drawNodes();

        // draw links
        this.drawLinks();

        // set force simulation
        this.updateGraph();
    }

    generateData() {
        console.log(this.words);
        const d = this.data.flat = {};
        const maxDepth = this.maxDepth;
        this.words.forEach(root => {
            function addToDataset(node,depth) {
                if (depth > maxDepth) { return; } // done
                if (d[node.id] && d[node.id].depth <= depth) { // skip
                    return;
                }

                if (node instanceof Word) {
                    d[node.id] = {
                        id: node.id,
                        depth: depth,
                        data: node
                    }
                }
                else if (node instanceof Link) {
                    d[node.id] = {
                        id: node.id,
                        depth: depth,
                        data: node
                    }
                    // recurse to start/endpoint
                    if (node.words) {
                        node.words.forEach(anchor => addToDataset(anchor, depth + 1));
                    }
                }
                // recurse to adjacent links
                var links = [].concat( node.parentsL, node.parentsC, node.parentsR );
                links.forEach(l => addToDataset(l, depth + 1));
            }
            addToDataset(root, 0);
        });

        // sort flat data into nodes and links
        const a = this.data.anchors = [];
        const l = this.data.links = [];

        for (var datum in d) {
            if (d[datum].data instanceof Word) {
                a.push(d[datum]);
            }
            else {
                l.push(d[datum]);
            }
        }

        console.log(a, l);


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
                d.fx += d3.event.dx,
                d.fy += d3.event.dy;
            })
            .on('end', (d) => {
                if (!d3.event.active) {
                    sim.alphaTarget(0);
                }
            });

        // data entry/merge
        // var nodeGroup = this.nodes.selectAll('.node-group')
        //     .data(this.data.anchors);
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
                d.x = clampX(d.x);
                d.y = clampY(d.y);
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

            return  "M" + source.x + "," + source.y +
                "A" + dr + "," + dr + " 0 0,1 " +
                target.x + "," + target.y;
          }
        }

        this.simulation
            .nodes(this.data.anchors)
            .on('tick', tick);

        if (this.simulation.alpha() < 0.1) {
            this.simulation.alpha(0.3).restart();
        }
    }
}//end class GraphLayout
