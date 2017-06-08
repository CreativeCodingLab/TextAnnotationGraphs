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
        link: 'cyan'
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

        // draw links
        ctx.globalAlpha = 0.75;
        linkObjs.forEach(function(link) {
            let minRow = link.rootMinWord.row.idx;
            let maxRow = link.rootMaxWord.row.idx;

            let width = maxRow > minRow ? ROW_WIDTH : link.linesRightX[link.linesRightX.length - 1] - link.linesLeftX[0];

            let y = (slots[minRow - 1] || 0) + rows[minRow].maxSlots - link.h;

            // choose color
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

            // draw links spanning multiple rows
            if (maxRow > minRow) {
                for (let i = minRow + 1; i < maxRow; ++i) {
                    y = slots[i - 1] + rows[i].maxSlots - link.h;
                    ctx.fillRect(0, y * RECT_HEIGHT + i * PADDING, width * r, RECT_HEIGHT);
                }

                y = slots[maxRow - 1] + rows[maxRow].maxSlots - link.h;
                ctx.fillRect(0, y * RECT_HEIGHT + maxRow * PADDING, link.linesRightX[link.linesRightX.length - 1] * r, RECT_HEIGHT);
            }
        });

        // translate canvas contents according to scroll position
        dy = (slots[scrollIndex - 1] || 0) * RECT_HEIGHT + scrollIndex * PADDING;
        ctx.setTransform( 1, 0, 0, 1, 0, -dy );

        // handle click event
        if (clicked === true) {
            clicked = false;

            let y = click * h + dy;
            let i = slots.findIndex((d, i) => d * RECT_HEIGHT + i * PADDING >= y);
            if (rows[i]) {
                document.body.scrollTop = rows[i].ry;
            }
            else {
                document.body.scrollTop = rows[rows.length - 1].ry;
            }
        }

        window.requestAnimationFrame(update);
    }

    // drag events
    let drag = 0;
    let mousedown = false;
    function onmousedown(e) {
        drag = e.y;
        mousedown = true;
    }
    function onmousemove(e) {
        if (mousedown) {
            document.body.scrollTop += (e.y - drag) * window.innerHeight / h;
            drag = e.y;
        }
    }
    function onmouseup() {
        mousedown = false;
    }

    let clicked = false;
    let click = 0;
    function onclick(e) {
        clicked = true;
        click = e.offsetY / e.target.getBoundingClientRect().height;
    }

    class Minimap {
        constructor() {
            if (singleton === false) {
                singleton = true;

                view = document.querySelector('#minimap canvas');
                let toggle = document.getElementById('toggle-minimap');

                // show / hide minimap
                toggle.onclick = function() {
                    show = !show;
                    this.style.textAlign = show ? 'left' : 'right';
                    this.innerHTML = show ? 'hide>>' : '&lt;&lt;minimap';
                    view.style.visibility = show ? 'visible' : 'hidden';
                };

                // swipe minimap to scroll page
                view.onmousedown = onmousedown;
                view.onclick = onclick;
                document.addEventListener('mousemove', onmousemove);
                document.addEventListener('mouseup', onmouseup);
                document.addEventListener('mouseleave', onmouseup);

                h = view.height;
                w = view.width;
                ctx = view.getContext('2d');
                update();
            }
        }
    }

    return Minimap;
})();