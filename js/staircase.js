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


        // My poor attempt to do something. SOMETHING...
        console.log(this);
        this.g.append("circle")
            .attr("cx", 30)
            .attr("cy", 30)
            .attr("r", 20);

        
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
        console.log(this);
    }

    graph(words) {

    }

    drawNodes() {

    }

    drawLinks() {
        
    }

}//end class GraphLayout
