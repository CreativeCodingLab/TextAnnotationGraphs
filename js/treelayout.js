const TreeLayout = (function() {

    // depth of recursion
    let maxDepth;

    // recursively build hierarchy from a root word or link
    function addNode(node, depth, source) {
        let incoming = [];

        let data = {
            node,
            incoming,
            name: node instanceof Word ? node.val : node.textStr,
            type: node instanceof Word ? 'Word' : 'Link'
        };

        if (depth < maxDepth) {
            let children = node.links
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

    // tree layout function
    const tree = d3.tree()
        .nodeSize([30,80])
        .separation((a,b) => {
            let separation = a.parent == b.parent ? 1 : 2;
            function reduce(acc, val) {
                if (val.expanded) { return acc + val.size; }
                return acc + 1;
            }
            separation += Math.max(b.data.incoming.reduce(reduce, 0), a.data.incoming.reduce(reduce, 0)) / 2;
            return separation;
        });

    class TreeLayout {
        constructor(el) {
            // container element
            this.svg = d3.select(el);
            this.g = this.svg.append('g');

            // add zoom/pan events
            this.svg.call(d3.zoom()
              .scaleExtent([1 / 2, 4])
              .on("zoom", () => {
                this.g.attr('transform', d3.event.transform);
              }))
              .on("dblclick.zoom", null);

            // selected words to generate graph around
            this.word = null;
            this.maxDepth = 20; // default value for max dist from root
        }
        resize() {
        }
        clear() {
            this.word = null;
            this.g.selectAll('*').remove();
        }

        /**
         * construct a set of hierarchies from an array of
         * Word or Link "root" nodes
         */
        graph(word) {
            this.word = word;

            maxDepth = this.maxDepth;
            let sum = 0;
            this.incoming = [];
            this.data = (function() {
                const seed = addNode(word, 0, null);

                const root = d3.hierarchy(seed);

                const data = {
                    root,
                    tree: tree(root),
                    offset: sum
                };

                return data;
            })();

            this.updateGraph();
        }

        updateIncoming(data, index) {

            const seed = addNode(data.node, 0, null);
            const root = d3.hierarchy(seed);

            const anchorInNewTree = root.descendants().find(node => node.data.node === data.anchor.data.node);

            let tree2 = tree(root);

            // remove extraneous hooks / shared nodes
            let range = d3.extent(root.leaves().concat(data.anchor), d => d.x);

            data.anchor.data.incoming.splice(data.anchor.data.incoming.indexOf(data.node), 1);
            anchorInNewTree.parent.children.splice(anchorInNewTree.parent.children.indexOf(anchorInNewTree), 1);

            // translate grafted tree onto old tree
            let dy = data.anchor.y - anchorInNewTree.y;
            let dx = data.anchor.x - anchorInNewTree.x;
            root.descendants().forEach(node => {
                node.x += dx;
                node.y += dy;
            });

/*            console.log('----- range',d3.extent(this.data[index].root.descendants(), d => d.x));
            console.log('graft range',d3.extent(root.descendants(), d => d.x));
            console.log(data.anchor.x, dx);
*/
            // -------- in progress
            // test case : Pos_reg         --> graft "outside"
            // test case : Promotes        --> graft "inside"
            // test case : Ubiquitination  --> graft left
            // test case : Phosphorylation --> two
/*            let graftLeftOfRoot = data.anchor.x < this.data[index].root.x;
            console.log(root.descendants());
            // rearrange old tree to not interfere with graft
            let range = d3.extent(root.leaves().concat(data.anchor), d => d.x);
            console.log(range);
            console.log(this.data[index].root.descendants().map(d => d.x));
            let children = data.anchor.descendants();
            let offset = Number.MIN_SAFE_INTEGER;
            this.data[index].root.descendants().forEach(node => {
                // not a shared branch
                if (children.indexOf(node) < 0) {
                    if (node.x <= range[1] && node.x >= range[0]) {
                        offset = Math.max(offset, node.x);
                    }
                }
            });
            offset = data.anchor.x - offset;
            console.log(offset);
            this.data[index].root.descendants().forEach(node => {
                if (children.indexOf(node) < 0) {
                    if (node.x <= range[1] && node.x >= range[0]) {
                        node.x -= offset;
                    }
                }
            })
*/
            // ------ end testing

            this.data.push({
                index,
                root,
                dx,
                tree: tree2,
                anchor: data.anchor,
                offset: this.data[index].offset
            });

            this.updateGraph();
        }

        updateGraph() {
            let group = this.g.selectAll('.group')
                .data(this.data);

            group.exit().remove();

            let groupEnter = group.enter().append('g')
                .attr('class','group')

            groupEnter.append('g')
                .attr('class', 'linkGroup');
            groupEnter.append('g')
                .attr('class', 'nodeGroup');

            let groupMerge = groupEnter.merge(group);

            groupMerge.select('.linkGroup')
                .datum((d, i, el) => {
                    el = d3.select(el[i])
                        .attr('transform', 'translate(' + d.offset + ', 0)');
                    this.drawLinks(d.tree, el);
                    if (d.anchor) {
                        let [x1, y1] = [d.root.y, d.root.x];
                        let [x2, y2] = [d.anchor.y, d.anchor.x];
                        let curve_offset = 20;
                        el.select('.link--dashed').remove();
                        el.append('path')
                            .attr('class','link--dashed')
                            .attr('d', 'M' + [x1, y1] +
                                'C' + [x1 + curve_offset, y1, x1 + curve_offset, y2, x2, y2]);
                    }
                    else {
                        el.select('.link--dashed').remove();
                    }
                });

            groupMerge.select('.nodeGroup')
                .datum((d, i, el) => {
                    el = d3.select(el[i])
                        .attr('transform', 'translate(' + d.offset + ', 0)');

                    if (!isNaN(d.index)) { i = d.index; }
                    this.drawNodes(d.root, i, el);
                });
        }
        drawLinks(tree, el) {
            let link = el.selectAll('.link')
                .data(tree.links());

            link.exit().remove();

            link.enter().append('path')
                .attr('class', 'link')
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
                            'C' + [x1, y2, x1, y2, x2, y2];
                    }

                    return 'M' + [x1, y1] +
                        'C' + [x1 + curve_offset, y1, x1 + curve_offset, y2, x2, y2];
                  });
        }
        drawNodes(root, i, el) {
            function handleNodeClick(d) {
                unhoverNode(d);
                this.word = d.node;
                this.graph(this.word);
            }

            function hoverNode(d) {
                d.node.hover();
            }
            function unhoverNode(d) {
                d.node.unhover();
            }

            let data = root.descendants();

            let node = el.selectAll('.node')
                .data(data, d => d.data.node);

            node.exit().remove();

            let nodeEnter = node.enter()
                .append('g')
                .attr('transform', (d) => 'translate(' + data[0].y + ',' + data[0].x + ')')
                .attr('class', (d) => 'node' + (d.children ? ' node--internal' : ' node--leaf') + (d.parent ? '' : ' node--root'));

            nodeEnter.append('path');   // symbol
            nodeEnter.append('text');   // label

            let nodeMerge = nodeEnter.merge(node);
            nodeMerge.transition()
                .attr('transform', (d) => 'translate(' + d.y + ',' + d.x + ')');

            nodeMerge
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
                        anchor: d,
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
                .attr('transform', (d, i) => 'translate(-30,' + (-15 * i - 25) + ')')
                .on('mouseover', (d) => hoverNode.bind(this)(d))
                .on('mouseout', (d) => unhoverNode.bind(this)(d))
                .on('click', (d) => handleNodeClick.bind(this)(d))
                .on('contextmenu', (d) => {
                    unhoverNode.bind(this)(d);
                    d3.event.preventDefault();
                    if (d.anchor.parent === null) {
                        handleNodeClick.bind(this)(d);
                    }
                    else {
                        this.updateIncoming(d, i);
                    }
                });

            inMerge.select('path')
                .attr('d', (d, i) => {
                    let dy = 15 * i + 25;
                    return 'M0,0, C30,0,30,' + dy + ',30,' + dy;
                });

            inMerge.select('text')
                .text(d => d.name);

        }
    }//end class TreeLayout

    return TreeLayout;
})();
