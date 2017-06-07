const Minimap = (function() {

    let show = true;
    let singleton = false;
    let view;
    let ctx;
    let h;
    let w;

    const ROW_HEIGHT = 15;
    const COLOR = {
        word: '#888',
        untagged: '#aaa',
        selected: 'crimson',
        link: 'blue'
    }

    wordColor = '#888';


    function update() {
        const ROW_WIDTH = Config.svgWidth;
        const r = w / ROW_WIDTH;

        ctx.clearRect(0,0,w,h);

        rows.forEach(function(row, i) {
            row.words.forEach(function(word) {
                ctx.fillStyle = word.tag ? COLOR.word : COLOR.untagged;
                if (word.isSelected) {
                    ctx.fillStyle = COLOR.selected;
                }
                ctx.fillRect(word.leftX * r, i * ROW_HEIGHT * 1.3, word.underneathRect.width() * r, ROW_HEIGHT);
            });
        });

        linkObjs.forEach(function(link) {
            let minRow = link.rootMinWord.row.idx;
            let maxRow = link.rootMaxWord.row.idx;

            let width = maxRow > minRow ? ROW_WIDTH : link.linesRightX[0] - link.linesLeftX[0];

            ctx.fillStyle = link.isSelected ? COLOR.selected : COLOR.link;
            ctx.fillRect(link.linesLeftX[0] * r, minRow * ROW_HEIGHT * 1.3, width * r, ROW_HEIGHT * 0.2);

            if (maxRow > minRow) {
                for (let i = minRow + 1; i < maxRow; ++i) {
                    ctx.fillRect(0, i * ROW_HEIGHT * 1.3, ROW_WIDTH * r, ROW_HEIGHT * 0.2);
                }
                ctx.fillRect(0, maxRow * ROW_HEIGHT * 1.3, link.linesRightX[link.linesRightX.length - 1] * r, ROW_HEIGHT * 0.2);
            }
        });

        window.requestAnimationFrame(update);
    }

    class Minimap {
        constructor() {
            if (singleton === false) {
                singleton = true;

                view = document.querySelector('#minimap canvas');
                let toggle = document.getElementById('toggle-minimap');

                toggle.onclick = function() {
                    show = !show;
                    this.style.textAlign = show ? 'left' : 'right';
                    this.innerHTML = show ? 'hide>>' : '&lt;&lt;minimap';
                    view.style.visibility = show ? 'visible' : 'hidden';
                };

                h = view.getBoundingClientRect().height;
                w = view.getBoundingClientRect().width * 3;
                ctx = view.getContext('2d');
                update();
            }
        }
    }

    return Minimap;
})();