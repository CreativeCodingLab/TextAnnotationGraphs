class Staircase {
    constructor() {
        this.isOpen = false;

        // references to dom elements
        this.drawing = document.getElementById('drawing');
        this.div = document.getElementById('graph') || 
                   document.createElement('div');
        this.div.id = "graph";
        document.body.appendChild(this.div);

        // dimensions & properties
        //this.bounds = this.div.getBoundingClientRect();
        var boundingClientRect = this.div.getBoundingClientRect();

        // Extend the viewport
        this.bounds = {
            top: boundingClientRect.top,
            bottom: boundingClientRect.bottom,
            left: boundingClientRect.left,
            right: boundingClientRect.right,
            width: boundingClientRect.width * 5,
            height: boundingClientRect.height * 5
        };

        // d3 dom references
        this.svg = d3.select('#graph')
                    .append('svg')
                    .attr('width', this.bounds.width)
                    .attr('height', this.bounds.height)
                    .style("overflow", "scroll")
                    ;

        // zoom
        var zoom = d3.zoom().scaleExtent([1, 5])
            //.translateExtent([[0, -100], [this.bounds.width + 90, this.bounds.height + 100]])
            ;

        this.g = this.svg.append('g')                    
                    .attr('transform', 'translate(' + 10 + ',' + 10 + ')')
                    .call(zoom)
                    ;

        this.links = this.g.append('g')
                    .attr('class','links')
                    ;

        this.nodes = this.g.append('g')
                    .attr('class','nodes')
                    ;

        zoom.on("zoom", function () {
            //this.svg.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")");
        });    

        // Tree-structured data, stored as a four dimensional array. 
        // I wish the dataset would support four levels: document, paragraph, 
        // sentence, and word. Since the first two are not available, 
        // we just set them to zero.
        this.data = new Array();

        // the box of each sentence only display the first few words
        this.excerptSize = 3;
        this.excerptMaxLength = 0;
        
        this.wordLength = new Array();
        this.wordMaxLength = 0;

        // Margin (top and left) for a word in a box
        this.margin = 20;

        // All steps that create this staircase
        this.steps = new Array();
        
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

        // Err... I don't think the starcase needs a translate at the beginning
        //this.g
        //    .attr('transform','translate(' + this.bounds.width/2 + ',' + this.bounds.height/2 + ')');

        if (!this.nodes.selectAll('.node-group').empty()) {
            this.updateGraph();
        }
    }

    graph(wordObjs, linkObjs) {
        // generate a tree structure from the given list of words
        this.generateData(wordObjs);

        var maxLength = this.getMaxLength();
        this.wordMaxLength = maxLength[0]; 
        this.excerptMaxLength = maxLength[1];

        // draw nodes
        this.drawNodes();

        // draw links
        this.drawLinks();

        // set force simulation
        this.updateGraph([]);
    }

    // Create a tree from given data
    // This tree has two levels: sentence & word.
    // I wish the dataset supported up to four levels: document, paragraph,
    // sentence, and word.
    generateData(words) {
        var idx = 0;
        var docId = 0;
        var parId = 0;
        var senId = 0;
        var wrdId = 0;
        
        // initiate a 4-dimensional array.
        // this.data[0][1][2][3] means the 4th word in the 3rd sentence of
        // the 2nd paragraph in the 1st document
        this.data = new Array(new Array(new Array(new Array())));

        while (idx < words.length) {
            // If there is a period before this word, move to a new sentence
            if (wrdId > 0 && words[idx - 1].val === ".") {
                senId++;
                this.data[docId][parId][senId] = new Array();
                wrdId = 0;
            }
            
            this.data[docId][parId][senId][wrdId] = {
                val: words[idx].val, 
                tag: words[idx].data.syntaxData.tag
            };

            wrdId++;
            idx++;
        }
    }

    // get lengths of the longest word and the longest sentence excerpt
    getMaxLength() {
        var lengthWord = 0;
        var lengthExcerpt = 0;

        for (var docId = 0; docId < this.data.length; docId++) {
            for (var parId = 0; parId < this.data[docId].length; parId++) {
                for (var senId = 0; senId < this.data[docId][parId].length; senId++) {
                    
                    // excerpt
                    if (this.data[docId][parId][senId].length >= 3) {
                        var excerpt = this.data[docId][parId][senId][0]
                            + " " + this.data[docId][parId][senId][1]
                            + " " + this.data[docId][parId][senId][2];
                        var excerptText = this.g.append("text")
                            .attr("x", 0)
                            .attr("y", 0)
                            .text(excerpt)
                            ;
                        if (excerptText.node().getBBox().width > lengthExcerpt)
                            lengthExcerpt = excerptText.node().getBBox().width;

                        this.g.selectAll("text").remove();
                    }

                    // word
                    for (var wrdId = 0; wrdId < this.data[docId][parId][senId].length; wrdId++) {  
                        var text = this.g.append("text")
                            .attr("x", 0)
                            .attr("y", 0)
                            .text(this.data[docId][parId][senId][wrdId].val)
                            .attr("style", "font-size: 8; font-family: Helvetica, sans-serif")
                            ;

                        if (text.node().getBBox().width > lengthWord)
                            lengthWord = text.node().getBBox().width;
                    
                        this.wordLength.push({
                            width: text.node().getBBox().width,
                            height: text.node().getBBox().height
                        });

                        this.g.selectAll("text").remove();
                    }
                }
            }
        }

        return [lengthWord, lengthExcerpt];
    }

    drawNodes() {
        var wordLoc = 0;
        var loc_sen = 0;

        for (var docId = 0; docId < this.data.length; docId++) {
            for (var parId = 0; parId < this.data[docId].length; parId++) {
                for (var senId = 0; senId < this.data[docId][parId].length; senId++) {
                    for (var wrdId = 0; wrdId < this.data[docId][parId][senId].length; wrdId++) {      
                        
                        var rect = this.g.append("rect")
                            .attr("x", wordLoc)
                            .attr("y", wordLoc)
                            .attr("width", this.wordMaxLength + this.margin)
                            .attr("height", this.wordMaxLength + this.margin)
                            .style("stroke", "black")
                            .style("stroke-width", 1)
                            .style("fill", "none")
                            ;

                        var text = this.g.append("text")
                            .attr("x", wordLoc + this.margin)
                            .attr("y", wordLoc + this.margin)
                            .text(this.data[docId][parId][senId][wrdId].val)
                            .attr("style", "font-size: 8; font-family: Helvetica, sans-serif")
                            ;

                        if (this.data[docId][parId][senId][wrdId].tag.length > 0) {
                            this.g.append("rect")
                                .attr("x", wordLoc + (this.wordMaxLength + this.margin)/2 )
                                .attr("y", wordLoc + this.wordMaxLength - this.margin)
                                .attr("width", (this.wordMaxLength + this.margin)/2 )
                                .attr("height", this.margin)
                                .style("fill", "red")
                                ;

                            var label = this.g.append("text")
                                .attr("x", wordLoc + this.wordMaxLength)
                                .attr("y", wordLoc + this.wordMaxLength)
                                .style("text-anchor","end") 
                                //.attr("dominant-baseline","central")
                                .attr("fill","white")
                                .text(this.data[docId][parId][senId][wrdId].tag)
                                ;
                        }

                        wordLoc += this.wordMaxLength + this.margin;
                    }
                }
            }
        }
    }

    drawLinks() {
        
    }

    updateGraph(selectedWords) {
        /*
        console.log(this);
        this.g.append("circle")
            .attr("cx", this.steps[0].position.x)
            .attr("cy", this.steps[0].position.y)
            .attr("r", this.steps[0].size);
        */
    }

}//end class Staircase



// A part of the staircase. Each step is a square which contains either
// a word or an excerpt of a sentence/paragraph.
class Step {
    constructor() {
        this.size = 20;
        this.position = {x: 20, y: 20};
        this.style = {strokeColor: "black", strokeWidth: 1, fill: "none"};
    }
}// end class Step
