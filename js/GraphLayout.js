class GraphLayout {
    constructor() {
        this.isOpen = false;

        // references to dom elements
        this.drawing = document.getElementById('drawing');
        this.div = document.getElementById('graph') || 
                   document.createElement('div');
        this.div.id = 'graph';
        document.body.appendChild(this.div);

        // dimensions & properties
        this.bounds = this.div.getBoundingClientRect();

        // d3 dom references
        this.svg = d3.select('#graph').append('svg')
            .attr('width', this.bounds.width)
            .attr('height', this.bounds.height);
        this.g = this.svg.append('g');
        this.links = this.g.append('g')
            .attr('class','links');
        this.nodes = this.g.append('g')
            .attr('class','nodes');

        // margins and drag event for positioning svg
        this.leftMargin = 0;
        this.topMargin = 0;

        this.dx = 0;
        this.dy = 0;
        this.svg
            .call(d3.drag()
                .on('drag', () => {
                    this.dx += d3.event.dx;
                    this.dy += d3.event.dy;
                    this.adjustMargins(this.dx, this.dy);
                })
            )
            .on('dblclick', () => {
                if (d3.event.target === this.svg.node()) {
                    this.dx = this.dy = 0;
                    this.adjustMargins();
                }
            });
        this.resize();

        // selected words to generate graph around
        this.words = [];
        this.maxDepth = 20; // default value for max dist from root
    }
    resize() {
        this.bounds = this.div.getBoundingClientRect();
        this.svg
            .attr('width', this.bounds.width)
            .attr('height', this.bounds.height);

        this.adjustMargins();
    }
    adjustMargins(dx = 0, dy = 0) {        
        this.g.attr('transform','translate(' + (20 + dx + this.leftMargin) + ', ' + (10 + dy + this.topMargin) + ')');
    }
    clear() {
        this.words = [];
        this.nodes.selectAll('*').remove();
        this.links.selectAll('*').remove();
    }
    graph(words) {
        if (words.length === 0 || this.words.length === words.length && 
            this.words.every((w,i) => words.indexOf(w) > -1)) { return; }
        else { this.words = words; }

        const maxDepth = this.maxDepth;
        let localMaxDepth = 0;
        function addNode(node, depth, source) {
            let incoming = [];

            let data = {
                node,
                incoming,
                name: node instanceof Word ? node.val : node.textStr,
                type: node instanceof Word ? 'Word' : 'Link'
            };

            if (depth > localMaxDepth) { localMaxDepth = depth; }
            if (depth < maxDepth) {
                let children = node.parents
                    .filter(parent => {
                        // ignore "incoming" links
                        if (parent !== source && parent instanceof Link) {
                            const i = parent.words.indexOf(node);
                            if (i < 0 || parent.arrowDirections[i] === -1) {
                                incoming.push(parent);
                                return false;
                            }
                        }
                        return parent !== source;
                    })
                    .map((parent) => addNode(parent, depth + 1, node));

                if (node instanceof Link) {
                    let anchors = node.words
                        .map((word, i) => {
                            if (word !== source) {
                                const newNode = addNode(word, depth + 1, node);

                                if (node.arrowDirections[i] === -1) {
                                    newNode.receivesArrow = true;
                                }

                                return newNode;
                            }
                            return null;
                        })
                        .filter(word => word);

                    children = children.concat(anchors);
                }

                if (children.length > 0) {
                    data.children = children;
                }
            }

            return data;
        };

        let sum = 0;
        this.data = this.words.map(word => {
            localMaxDepth = 0;
            const seed = addNode(word, 0, null);

            const root = d3.hierarchy(seed);

            const data = {
                root,
                tree: d3.tree()
                    .size([180, localMaxDepth * 80])
                    (root),
                length: localMaxDepth,
                offset: sum
            };

            sum += (localMaxDepth * 80 + 200);
            return data;
        });

        this.updateGraph();
    }
    updateGraph() {
        let links = this.links.selectAll('.linkGroup')
            .data(this.data);

        links.exit().remove();
        links.enter().append('g')
            .attr('class','linkGroup')
        .merge(links)
            .each((d, i, el) => {
                el = d3.select(el[i])
                    .attr('transform', 'translate(' + d.offset + ', 0)');
                this.drawLinks(d.tree, el);
            });

        let nodes = this.nodes.selectAll('.nodeGroup')
            .data(this.data);

        nodes.exit().remove();
        nodes.enter().append('g')
            .attr('class','nodeGroup')
        .merge(nodes)
            .each((d, i, el) => {
                el = d3.select(el[i])
                    .attr('transform', 'translate(' + d.offset + ', 0)');
                this.drawNodes(d.root, i, el);
            });

        // adjust offset
        let rootText = this.nodes.select('.node--root');
        if (!rootText.empty()) {
            this.leftMargin = rootText.node().getBBox().width;

            let dy = this.nodes.node().getBBox().y;
            this.topMargin = (dy < 0) ? -dy : 0;
            this.adjustMargins(this.dx, this.dy);
        }
    }
    drawLinks(tree, el) {
        let link = el.selectAll('.link')
            .data(tree.links());

        link.exit().remove();

        link.enter().append('path')
            .attr('class', 'link')
            .attr('fill', 'none')
            .attr('stroke','#999')
        .merge(link)
            .transition()
            .attr('d', (d) => {
                let [x1, y1] = [d.source.y, d.source.x];
                let [x2, y2] = [d.target.y, d.target.x];
                let curve_offset = 20;

                // check if arrows are directional
                if ( d.source.children.length > 1 && 
                     d.source.data.type === 'Link' &&
                     d.source.data.node.arrowDirections.indexOf(-1) > -1 ) {

                    return 'M' + [x1, y1] +
                        'C' + [x1, y2] +
                        ',' + [x1, y2] + 
                        ',' + [x2, y2];
                }

                return 'M' + [x1, y1] +
                    'C' + [x1 + curve_offset, y1] +
                    ',' + [x1 + curve_offset, y2] + 
                    ',' + [x2, y2];
              });
    }
    drawNodes(root, i, el) {
        function handleNodeClick(d) {
            unhoverNode(d);
            let newArray = this.words.slice();
            let word = newArray.splice(i, 1, d.node)[0];
            word.toggleHighlight(false);
            d.node.toggleHighlight(true);
            this.graph(newArray);
        }

        function hoverNode(d) {
            d.node.hover();
        }
        function unhoverNode(d) {
            d.node.unhover();
        }

        let node = el.selectAll('.node')
            .data(root.descendants());

        node.exit().remove();

        let nodeEnter = node.enter()
            .append('g')
            .attr('class', (d) => 'node' + (d.children ? ' node--internal' : ' node--leaf') + (d.parent ? '' : ' node--root'));

        nodeEnter.append('path');   // symbol
        nodeEnter.append('text');   // label

        let nodeMerge = nodeEnter.merge(node);

        nodeMerge
            .attr('transform', (d) => 'translate(' + d.y + ',' + d.x + ')')
            .on('mouseover', function() {
                d3.select(this).selectAll('.node--incoming')
                    .transition()
                    .attr('opacity', 1);
            })
            .on('mouseout', function() {
                d3.select(this).selectAll('.node--incoming')
                    .transition()
                    .attr('opacity', 0.5);
            });

        nodeMerge.select('path')
            .attr('d', d3.symbol()
                .type((d) => d.data.type === 'Word' ? (d.data.receivesArrow ? d3.symbolTriangle : d3.symbolSquare) : d3.symbolCircle)
                .size(20)
            )
            .attr('transform', (d) => d.data.receivesArrow && d.data.type === 'Word' ? 'rotate(-30)' : 'rotate(45)')
            .attr('stroke', 'grey')
            .attr('fill', (d) => d.data.type === 'Word' ? 'black' : 'white')
            .on('mouseover', (d) => hoverNode.bind(this)(d.data))
            .on('mouseout', (d) => unhoverNode.bind(this)(d.data))
            .on('click', (d) => handleNodeClick.bind(this)(d.data));

        nodeMerge.select('text')
            .text((d) => d.data.name)
            .attr('fill', (d) => d.data.node.isSelected ? '#c37' : '#555')
            .attr('x', (d) => d.children ? -8 : 8)
            .attr('dy', (d) => {
                if (!d.parent || !d.children) {
                    return 3;
                }
                else if (d.x === d.parent.x) {
                    return root.x > d.x ? -6 : 12;
                }
                return d.parent.x > d.x ? -6 : 12;
            })
            .style('text-anchor', (d) => d.children ? 'end' : 'start');

        let incoming = nodeMerge.selectAll('.node--incoming')
            .data((d) => d.data.incoming.map(node => {
                return {
                    node,
                    name: node instanceof Word ? node.val : node.textStr,
                    length: d.data.incoming.length
                };
            }));

        incoming.exit().remove();
        let inEnter = incoming.enter()
            .append('g')
                .attr('class','node--incoming')
                .attr('opacity', 0.5);

        inEnter.append('path')
            .attr('fill','none')
            .attr('stroke', 'grey')
            .attr('stroke-dasharray', [2,2]);

        inEnter.append('circle')
            .attr('fill','grey')
            .attr('r',2.5);

        inEnter.append('text')
            .attr('fill','#da8000')
            .attr('dy',3)
            .attr('x', -8)
            .style('text-anchor','end');

        let inMerge = inEnter.merge(incoming)
            .attr('transform', (d, i) => 'translate(-30,' + (-20 * i - 20) + ')')
            .on('mouseover', (d) => hoverNode.bind(this)(d))
            .on('mouseout', (d) => unhoverNode.bind(this)(d))
            .on('click', (d) => handleNodeClick.bind(this)(d));

        inMerge.select('path')
            .attr('d', (d, i) => {
                let dy = 20 * i + 20;
                return 'M0,0, C30,0,30,' + dy + ',30,' + dy;
            });

        inMerge.select('text')
            .text(d => d.name);

    }
}//end class GraphLayout
