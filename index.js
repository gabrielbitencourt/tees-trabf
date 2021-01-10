const CONSTS = {
    ROWS: 7,
    COLS: 7,
    GRID_COLOR: 'rgba(0, 0, 0, .3)',
    CELL_SIZE: 50,
    COLORS_ENUM: [
        'red',
        'green',
        'blue',
        'yellow',
        // 'purple',
        // 'pink',
        // 'cyan'
    ]
};


class Cell {
    /**
     * 
     * @param {'red' | 'green' | 'blue' | 'yellow' | 'purple'} color 
     */
    constructor(color) {
        this.color = color || CONSTS.COLORS_ENUM[Math.floor(Math.random() * CONSTS.COLORS_ENUM.length)];
        this.selected = false;
    }
}

class Game {
    
    /**
     * 
     * @param {HTMLCanvasElement} canvas html canvas element
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this.offsetX = (this.canvas.width - (CONSTS.COLS * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.offsetY = (this.canvas.height - (CONSTS.ROWS * CONSTS.CELL_SIZE + 1) - 1) / 2;

        this.frame = null;
        this.running = false;

        this.grid = new Array(CONSTS.ROWS);
        this.grid.fill([]);

        this.grid = this.grid.map(() => {
            const row = new Array(new Cell());
            for (let c = 0; c < CONSTS.COLS; c++) {
                row[c] = new Cell();
            }
            return row;
        });
        this.selected = null;
        this.points = 0;


        // binding this to every function to avoid .bind(this) on every callback
        for (let prop of Object.getOwnPropertyNames(Object.getPrototypeOf(this))) {
            if (typeof this[prop] === 'function') {
                this[prop] = this[prop].bind(this);
            }
        }

        this.drawGrid();
        this.checkSequences(0, 0);
    }

    start() {
        this.running = true;
        window.onresize = this.resizeHandler;
        this.canvas.onclick = this.clickHandler;
        this.loop();
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
    }

    resizeHandler() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this.offsetX = (this.canvas.width - (CONSTS.COLS * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.offsetY = (this.canvas.height - (CONSTS.ROWS * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.loop();
    }

    /**
     * 
     * @param {MouseEvent} ev 
     */
    async clickHandler(ev) {
        const bounds = {
            minX: this.offsetX,
            minY: this.offsetY,
            maxX: this.offsetX + (CONSTS.COLS * (CONSTS.CELL_SIZE + 1)),
            maxY: this.offsetY + (CONSTS.ROWS * (CONSTS.CELL_SIZE + 1))
        };

        if (ev.clientX > bounds.minX && ev.clientX < bounds.maxX && ev.clientY > bounds.minY && ev.clientY < bounds.maxY) {
            const x = Math.floor((ev.clientX - bounds.minX) / CONSTS.CELL_SIZE);
            const y = Math.floor((ev.clientY - bounds.minY) / CONSTS.CELL_SIZE);

            if (!this.selected) {
                this.grid[y][x].selected = true;
                this.selected = { x, y };
            }
            else {
                if (this.grid[y][x].selected === false) {
                    if ((x === this.selected.x && Math.abs(y - this.selected.y) === 1) || (y === this.selected.y && Math.abs(x - this.selected.x) === 1)) {
                        // check if theres sequences

                        const temp = this.grid[y][x];
                        this.grid[y][x] = this.grid[this.selected.y][this.selected.x];
                        this.grid[this.selected.y][this.selected.x] = temp;
                        
                        const points = await this.checkSequences();
                        if (points === 0) {
                            this.grid[this.selected.y][this.selected.x] = this.grid[y][x];
                            this.grid[y][x] = temp;
                        }
                        else {
                            this.points = this.points + points;
                            this.onPointsScored(this.points);
                        }

                        this.grid[y][x].selected = false;
                        this.grid[this.selected.y][this.selected.x].selected = false;
                        this.selected = null;
                    }
                    else {
                        console.error('jogada não permitida');
                    }
                }
                else {
                    this.grid[y][x].selected = false;
                    this.selected = null;
                }
            }
            
        }
        this.loop();
    }

    /**
     * 
     * @param {number?} time animation frame time when used with requestAnimationFrame
     */
    loop(time) {
        this.clear();

        this.ctx.beginPath();
        this.drawGrid();
    }

    pause() {
        window.cancelAnimationFrame(this.frame);
        this.frame = null;
        if (this.scheduled) clearTimeout(this.scheduled);
    }

    drawGrid() {
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONSTS.GRID_COLOR;

        // horizontal lines
        for (let i = 0; i <= CONSTS.COLS; i++) {
            const fixedX = i * (CONSTS.CELL_SIZE + 1) + this.offsetX;
            this.ctx.moveTo(fixedX, this.offsetY);
            this.ctx.lineTo(fixedX, (CONSTS.CELL_SIZE + 1) * CONSTS.ROWS + this.offsetY);
        }
    
        // vertical lines
        for (let j = 0; j <= CONSTS.ROWS; j++) {
            const fixedY = j * (CONSTS.CELL_SIZE + 1) + this.offsetY;
            this.ctx.moveTo(this.offsetX, fixedY);
            this.ctx.lineTo((CONSTS.CELL_SIZE + 1) * CONSTS.COLS + this.offsetX, fixedY);
        }
    
        this.ctx.stroke();

        for (let r = 0; r < CONSTS.ROWS; r++) {
            for (let c = 0; c < CONSTS.COLS; c++) {
                const cell = this.grid[r][c];
                if (cell) {
                    const x = this.offsetX + (c * (CONSTS.CELL_SIZE + 1)) + ((CONSTS.CELL_SIZE + 1) / 2);
                    const y = this.offsetY + (r * (CONSTS.CELL_SIZE + 1)) + ((CONSTS.CELL_SIZE + 1) / 2);
                    this.drawCircle(x, y, cell.color, cell.selected ? 'black' : undefined);
                }
            }
        }
    }

    /**
     * 
     * @param {number} x 
     * @param {number} y 
     * @param {'red' | 'green' | 'blue' | 'yelow' | 'purple'} fill 
     * @param {number} r 
     * @param {'black'} stroke 
     */
    drawCircle(x, y, fill, stroke, r = (CONSTS.CELL_SIZE - 4) / 2) {
        this.ctx.fillStyle = fill;
        this.ctx.strokeStyle = stroke;

        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, 2 * Math.PI);
        this.ctx.fill();
        if (stroke) this.ctx.stroke();
    }

    /**
     * 
     * @param {number} acc score accumulator for recursive calls
     * 
     * @returns {Promise<number>} number of cells scored
     */
    async checkSequences(acc = 0, timeout = 500) {
        let score = acc;
        for (let r = 0; r < CONSTS.ROWS; r++) {
            const row = this.grid[r];
            for (let c = 0; c < CONSTS.COLS; c++) {
                const cell = row[c];
                let sequenceV = 1;
                let sequenceH = 1;

                let walkingC = c + 1;
                while (walkingC < CONSTS.COLS && row[walkingC].color === cell.color) {
                    sequenceH = sequenceH + 1;
                    walkingC = walkingC + 1;
                }

                let walkingR = r + 1;
                while (walkingR < CONSTS.ROWS && this.grid[walkingR][c].color === cell.color) {
                    sequenceV = sequenceV + 1;
                    walkingR = walkingR + 1;
                }


                if (sequenceH >= 3) {
                    console.log(`${cell.color} vertical sequence of ${sequenceH} from (${r + 1}, ${c + 1})`);
                    score = score + sequenceH;

                    for (let index = 0; index < sequenceH; index++) {
                        this.grid[r][c + index] = null;
                    }
                    this.loop();
                    await sleep(timeout);


                    let walkingS = sequenceH - 1;
                    while (walkingS >= 0) {
                        walkingR = r;
                        while (walkingR > 0) {
                            this.grid[walkingR][c + walkingS] = this.grid[walkingR - 1][c + walkingS];
                            this.grid[walkingR - 1][c + walkingS] = null;
                            walkingR = walkingR - 1;
                        }
                        this.grid[walkingR][c + walkingS] = new Cell();
                        walkingS = walkingS - 1;
                    }
                }
                if (sequenceV >= 3) {
                    console.log(`${cell.color} horizontal sequence of ${sequenceV} from (${r + 1}, ${c + 1})`);
                    score = score + sequenceV;

                    for (let index = 0; index < sequenceV; index++) {
                        this.grid[r + index][c] = null;
                    }
                    this.loop();
                    await sleep(timeout);
                    
                    let walkingS = 0;
                    while (walkingS < sequenceV) {
                        walkingR = r + walkingS;
                        while (walkingR > 0) {
                            this.grid[walkingR][c] = this.grid[walkingR - 1][c];
                            this.grid[walkingR - 1][c] = null;
                            walkingR = walkingR - 1;
                        }
                        this.grid[walkingR][c] = new Cell();
                        walkingS = walkingS + 1;
                    }
                }

                if (sequenceH >= 3 || sequenceV >= 3) {
                    this.loop();
                    await sleep(timeout);
                    return await this.checkSequences(score);
                }
            }
        }
        this.loop();
        return score;
    }
}

const canvas = document.querySelector('canvas#game');
const pointsLabel = document.querySelector('p#points');
const game = new Game(canvas);
game.start();
game.onPointsScored = (points) => {
    pointsLabel.innerHTML = `${points} pontos`;
};

function restart() {
    pointsLabel.innerHTML = `0 pontos`;
    const game = new Game(canvas);
    game.start();
    game.onPointsScored = (points) => {
        pointsLabel.innerHTML = `${points} pontos`;
    };
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
