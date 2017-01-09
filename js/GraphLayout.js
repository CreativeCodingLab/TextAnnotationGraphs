class GraphLayout {
    constructor() {
        this.isOpen = false;

        // references to dom elements
        this.drawing = document.getElementById('drawing');
        this.div = document.getElementById('graph') || 
                   document.createElement('div');
        this.div.id = "graph";
        document.body.appendChild(this.div);

        this.svg = document.createElement('svg');
        this.div.appendChild(this.svg);

        // selected words to generate graph around
        this.words = [];
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

        words.forEach(function(word) {
            console.log(word.val + ':');
            console.log(word.parentsL.concat(word.parentsR));
            // console.log(word.parentsR);
        })
    }
}