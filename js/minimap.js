const Minimap = (function() {

    let show = true;
    let singleton = false;
    let view;
    let ctx;
    let h;
    let w;
    let dy = 0;

    const RECT_HEIGHT = 3;
    const PADDING = 3;
    const COLOR = {
        word: '#888',
        untagged: '#aaa',
        selected: 'crimson',
        link: 'blue'
    }

    function update() {
        const ROW_WIDTH = Config.svgWidth;
        const r = w / ROW_WIDTH;

        ctx.clearRect(0,0,w,h + dy);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'white';

        let scrollIndex = 0;

        // draw word
        let slots = [];
        rows.forEach(function(row, i) {
            if (row.ry < document.body.scrollTop) { scrollIndex = i; }
            slots[i] = (slots[i - 1] || 0) + row.maxSlots + 1;

            row.words.forEach(function(word) {
                // choose color
                ctx.fillStyle = word.tag ? COLOR.word : COLOR.untagged;
                if (word.isSelected) {
                    ctx.fillStyle = COLOR.selected;
                }

                // add word rectangle
                ctx.fillRect(word.underneathRect.x() * r, (slots[i] - 1) * RECT_HEIGHT + i * PADDING, word.underneathRect.width() * r,RECT_HEIGHT + PADDING / 3);
            });

        });

        ctx.globalAlpha = 0.75;
        linkObjs.forEach(function(link) {
            let minRow = link.rootMinWord.row.idx;
            let maxRow = link.rootMaxWord.row.idx;

            let width = maxRow > minRow ? ROW_WIDTH : link.linesRightX[link.linesRightX.length - 1] - link.linesLeftX[0];

            let y = (slots[minRow - 1] || 0) + rows[minRow].maxSlots - link.h;

            ctx.fillStyle = COLOR.link;

            if (!link.isSelected && link.style) {
                if (link.style.stroke instanceof LinearGradient) {
                    let x = (maxRow > minRow) ? 0 : link.linesLeftX[0];
                    let gradient = ctx.createLinearGradient(x * r,0,width * r,0);
                    gradient.addColorStop(0, link.style.stroke.c1);
                    gradient.addColorStop(1, link.style.stroke.c2);
                    ctx.fillStyle = gradient;
                }
                else {
                    ctx.fillStyle = link.style.stroke;
                }
            }
            ctx.fillRect(link.linesLeftX[0] * r, y * RECT_HEIGHT + minRow * PADDING, width * r, RECT_HEIGHT);

            if (maxRow > minRow) {
                for (let i = minRow + 1; i < maxRow; ++i) {
                    y = slots[i - 1] + rows[i].maxSlots - link.h;
                    ctx.fillRect(0, y * RECT_HEIGHT + i * PADDING, width * r, RECT_HEIGHT);
                }

                y = slots[maxRow - 1] + rows[maxRow].maxSlots - link.h;
                ctx.fillRect(0, y * RECT_HEIGHT + maxRow * PADDING, link.linesRightX[link.linesRightX.length - 1] * r, RECT_HEIGHT);
            }
        });

        dy = (slots[scrollIndex - 1] || 0) * RECT_HEIGHT + scrollIndex * PADDING;
        ctx.setTransform( 1, 0, 0, 1, 0, -dy );

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

                h = view.height;
                w = view.width;
                ctx = view.getContext('2d');
                update();
            }
        }
    }

    return Minimap;
})();