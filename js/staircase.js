class Staircase {
    constructor(el) {
        // container element
        this.div = el;

        // dimensions & properties
        this.bounds = this.div.getBoundingClientRect();

        // d3 dom references
        this.svg = d3.select(this.div).append('svg')
            .attr('width', this.bounds.width)
            .attr('height', this.bounds.height);
        this.g = this.svg.append('g');

        this.steps = this.g.append("g")
            .attr("class", "steps");

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
        this.steps.selectAll('*').remove();
    }

    graph(words) {
        this.words = words;
        console.log(this.words);

        this.data = this.words.map(word => {
        });

        this.updateGraph();
    }

    updateGraph() {
        let steps = this.steps.selectAll('.stepGroup')
            .data(this.data);
        steps.exit().remove();

        steps.enter().append('g')
            .attr('class','stepGroup')
        .merge(steps)
            .each((d, i, el) => {
                el = d3.select(el[i])
                    .attr('transform', 'translate(10, 0)');
            });
    }
}//end class Staircase
