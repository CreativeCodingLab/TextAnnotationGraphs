/**
 * Not currently in use.
 */

import * as d3 from "d3";
import Word from "./components/word.js";
import Link from "./components/link.js";

module.exports = (function() {
  // depth of recursion
  let maxDepth;
  const rh = 50; // row height

  // recursively build hierarchy from a root word or link
  function addNode(node, depth, source) {
    let incoming = [];

    let data = {
      node,
      incoming,
      name: node instanceof Word ? node.val : node.textStr,
      type: node instanceof Word ? "Word" : "Link"
    };

    if (depth < maxDepth) {
      let children = node.links
        .filter((parent) => {
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
          .filter((word) => word);

        children = children.concat(anchors);
      }

      if (children.length > 0) {
        data.children = children;
      }
    }

    return data;
  }

  class TreeLayout {
    constructor(el, mainSVG, openInModal) {
      // container element
      this.isInModal = openInModal;
      this.svg = openInModal
        ? d3.select(el)
        : d3
            .select(document.body)
            .append("svg")
            .attr("id", "tree-svg");
      this.draggable = this.svg.append("g");
      this.g = this.draggable.append("g");

      let self = this;
      // this.svg.append('text')
      //   .text(openInModal ? 'Show in main window' : 'Pop into modal')
      //   .attr('id', 'tree-popout')
      //   .attr('x', 15)
      //   .attr('y', 25)
      //   .on('click', function() {
      //     let node = document.getElementById('tree-svg');
      //     let parent = node.parentNode;
      //     if (parent === document.body) {
      //       d3.select(this).text('Show in main window');
      //       d3.select(el).node().appendChild(node);
      //       self.isInModal = true;
      //     }
      //     else {
      //       d3.select(this).text('Pop into modal');
      //       document.body.appendChild(node);
      //       self.isInModal = false;
      //     }
      //     mainSVG.fire('build-tree');
      //   });
      this.svg
        .append("text")
        .text("Close")
        .attr("id", "tree-close")
        .attr("x", this.svg.node().getBoundingClientRect().width - 15)
        .attr("text-anchor", "end")
        .attr("y", 25)
        .on("click", () => {
          document.body.classList.add("tree-closed");
        });

      // add zoom/pan events
      this.svg
        .call(
          d3
            .zoom()
            .scaleExtent([1 / 2, 4])
            .on("zoom", () => {
              this.draggable.attr("transform", d3.event.transform);
            })
        )
        .on("dblclick.zoom", null);

      // selected words to generate graph around
      this.maxDepth = 20; // default value for max dist from root
      this.maxWidth = 0;
      this.layers = [];
    }

    resize() {
      let bounds = this.svg.node().getBoundingClientRect();
      this.g.attr(
        "transform",
        "translate(" +
          [
            bounds.width / 2 - this.maxWidth / 2,
            bounds.height / 2 - ((this.layers.length - 1) * rh) / 2
          ] +
          ")"
      );
    }

    clear() {
      this.g.selectAll("*").remove();
    }

    /**
     * construct a set of hierarchies from an array of
     * Word or Link "root" nodes
     */
    graph(selected) {
      maxDepth = this.maxDepth;

      let data = [];

      function addNode(node, source = null, depth = 0) {
        let data = {
          node,
          depth,
          children: [],
          siblings: []
        };

        if (depth < maxDepth) {
          let links = node.links.filter((l) => l.top);
          let args = [];
          let corefs = links
            .filter((x) => !x.trigger && (!source || x !== source.node))
            .map((coref) => {
              return {
                type: coref.reltype,
                args: coref.arguments
                  .filter((x) => x.anchor !== node && x.anchor !== source)
                  .map((x) => addNode(x.anchor, node, depth))
              };
            });

          if (node instanceof Word) {
            args = links.filter((x) => x.trigger === node);
          } else if (node instanceof Link) {
            args = node.arguments.map((x) => x.anchor);
          }

          data.children = args.map((arg) => addNode(arg, data, depth + 1));
          data.siblings = corefs;
        }

        return data;
      }

      let hierarchy = addNode(selected);

      let [nodes, links] = (function() {
        let nodes = [];
        let links = [];

        function flatten(node) {
          nodes.push(node);
          node.siblings.forEach((sibling) => {
            sibling.args.forEach((arg) => {
              flatten(arg);
              links.push({
                type: "sibling",
                label: sibling.type,
                source: node,
                target: arg
              });
            });
          });
          node.children.forEach((child) => {
            flatten(child);
            links.push({
              type: "child",
              source: node,
              target: child
            });
          });
        }

        flatten(hierarchy);

        return [nodes, links];
      })();

      let maxWidth = 0;
      let layers = [];
      nodes.forEach((node) => {
        layers[node.depth] = layers[node.depth] || [];
        layers[node.depth].push(node);
      });

      function shiftSubtree(node, dx, root) {
        node.offset += dx;
        if (node.offset > maxWidth) {
          maxWidth = node.offset;
        }
        if (!root) {
          node.siblings.forEach((node) => shiftSubtree(node, dx));
        }
        node.children.forEach((node) => shiftSubtree(node, dx));
      }

      for (let i = layers.length - 1; i >= 0; --i) {
        layers[i].forEach((node, j) => {
          // 1st pass: assign an initial offset according to children
          if (node.children.length > 0) {
            let leftChild = node.children[0];
            let rightChild = node.children[node.children.length - 1];
            node.offset = (leftChild.offset + rightChild.offset) / 2;
          } else if (j > 0) {
            node.offset = layers[i][j - 1].offset;
          } else {
            node.offset = 0;
          }
        });

        // 2nd pass: check that subtree doesn't collide with left tree
        function computeWidth(word, svg) {
          let text = svg.append("text").text(word);
          let length = text.node().getComputedTextLength();
          text.remove();
          return length;
        }

        layers[i].forEach((node, j) => {
          node.width = computeWidth(node.node.val, this.svg);
          if (j > 0) {
            const prev = layers[i][j - 1];
            const separation = prev.siblings.some(
              (sibling) => sibling.args.indexOf(node) > -1
            )
              ? 50
              : 20; // TODO: make more universal

            let dx =
              prev.offset +
              prev.width / 2 +
              node.width / 2 -
              node.offset +
              separation;
            if (dx > 0) {
              // shift subtree and right-ward trees by dx
              for (let k = j; k < layers[i].length; ++k) {
                shiftSubtree(layers[i][k], dx, true);
              }
            }
          }
          if (node.offset > maxWidth) {
            maxWidth = node.offset;
          }
        });
      } // end for

      this.maxWidth = maxWidth;
      this.layers = layers;

      let nodeSVG = this.g.selectAll(".node").data(nodes, (d) => d.node);

      let edgeLabel = this.g
        .selectAll(".edgeLabel")
        .data(
          links.filter((l) => l.source.node instanceof Link),
          (d) => d.source.node
        );

      let edgeSVG = this.g.selectAll(".edge").data(links, (d) => d.source.node);

      nodeSVG.exit().remove();
      nodeSVG
        .enter()
        .append("text")
        .attr("class", "node")
        .attr("text-anchor", "middle")
        .attr("transform", (d) => "translate(" + [d.offset, d.depth * rh] + ")")
        .merge(nodeSVG)
        .text((d) => d.node.val)
        .transition()
        .attr(
          "transform",
          (d) => "translate(" + [d.offset, d.depth * rh] + ")"
        );

      // resize
      this.resize();

      edgeSVG.exit().remove();
      edgeSVG
        .enter()
        .append("path")
        .attr("class", "edge")
        .attr("stroke", "grey")
        .attr("stroke-dasharray", (d) =>
          d.source.node instanceof Word ? [2, 2] : null
        )
        .attr("stroke-width", "1px")
        .attr("fill", "none")
        .merge(edgeSVG)
        .attr("d", (d) => {
          if (d.type === "sibling") {
            let x1, x2;
            if (d.target.offset > d.source.offset) {
              x1 = d.source.offset + d.source.width / 2;
              x2 = d.target.offset - d.target.width / 2;
            } else {
              x1 = d.target.offset + d.target.width / 2;
              x2 = d.source.offset - d.source.width / 2;
            }
            return (
              "M" +
              [x1 - 10, d.source.depth * rh + 5] +
              "v7h" +
              (x2 - x1 + 20) +
              "v-7"
            );
          } else if (d.type === "child") {
            let offset = 0;
            if (d.source.node.arguments) {
              offset = -7;
            }
            return (
              "M" +
              [d.source.offset, d.source.depth * rh + 5] +
              "C" +
              [
                d.source.offset,
                d.source.depth * rh + 25,
                d.target.offset,
                d.target.depth * rh - 40,
                d.target.offset,
                d.target.depth * rh - 15 + offset
              ]
            );
          }
        });

      edgeLabel.exit().remove();
      edgeLabel
        .enter()
        .append("text")
        .attr("text-anchor", "middle")
        .attr(
          "transform",
          (d) => "translate(" + [d.target.offset, d.target.depth * rh] + ")"
        )
        .attr("class", "edgeLabel")
        .attr("font-size", "0.65em")
        .merge(edgeLabel)
        .text((d, i) => {
          let arg = d.source.node.arguments.find(
            (arg) => arg.anchor === d.target.node
          );
          if (arg) {
            return arg.type;
          }
        })
        .transition()
        .attr(
          "transform",
          (d) =>
            "translate(" + [d.target.offset, d.target.depth * rh - 13] + ")"
        );
    }
  } //end class TreeLayout

  return TreeLayout;
})();
