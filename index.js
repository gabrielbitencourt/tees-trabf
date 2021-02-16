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

        this.bounds = {
            minX: this.offsetX,
            minY: this.offsetY,
            maxX: this.offsetX + (CONSTS.COLS * (CONSTS.CELL_SIZE + 1)),
            maxY: this.offsetY + (CONSTS.ROWS * (CONSTS.CELL_SIZE + 1))
        };

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
        this.findAndRemoveAllSequences();
    }

    start() {
        this.running = true;
        window.onresize = this.resizeHandler;
        this.canvas.onclick = this.clickHandler;
        this.loop();
        this.prevState = this;
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
        this.bounds = {
            minX: this.offsetX,
            minY: this.offsetY,
            maxX: this.offsetX + (CONSTS.COLS * (CONSTS.CELL_SIZE + 1)),
            maxY: this.offsetY + (CONSTS.ROWS * (CONSTS.CELL_SIZE + 1))
        };
        this.loop();
    }

    /**
     * 
     * @param {MouseEvent} ev 
     */
    async clickHandler(ev) {
        if (ev.clientX > this.bounds.minX && ev.clientX < this.bounds.maxX && ev.clientY > this.bounds.minY && ev.clientY < this.bounds.maxY) {
            const x = Math.floor((ev.clientX - this.bounds.minX) / CONSTS.CELL_SIZE);
            const y = Math.floor((ev.clientY - this.bounds.minY) / CONSTS.CELL_SIZE);

            if (!this.selected) {
                this.prevState = JSON.parse(JSON.stringify(this.grid));
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
                        
                        this.loop();
                        let sequences = this.checkCell({ row: y, col: x });
                        sequences.push(...this.checkCell({ row: this.selected.y, col: this.selected.x }, sequences));
                        await this.clenSequences(sequences);

                        let points = sequences.reduce((prev, sequence) => prev = prev + sequence.cells.length, 0);
                        if (points === 0) {
                            this.grid[this.selected.y][this.selected.x] = this.grid[y][x];
                            this.grid[y][x] = temp;
                        }
                        else {
                            while (sequences.length) {
                                this.loop();
                                const cellsModified = [];

                                this.points = this.points + points;
                                this.onPointsScored(this.points);

                                for (const sequence of sequences) {
                                    for (const sequenceCell of sequence.cells) {
                                        const modifiedInRow = await this.pullRow(sequenceCell.row, sequenceCell.col);
                                        if (sequence.direction === 'horizontal' || sequenceCell === sequence.cells[sequence.cells.length - 1]) {
                                            cellsModified.push(...modifiedInRow);
                                        }
                                    }
                                }
                                // check every cell of the rows modified starting from cell col to 0
                                // after the check, get all new sequences and pull those rows and repeat
                                sequences = [];
                                for (const modifiedCell of cellsModified) {
                                    this.loop();
                                    const newSequences = this.checkCell(modifiedCell, sequences);
                                    sequences.push(...newSequences);
                                    if (newSequences.length) await sleep(200);
                                }
                                await this.clenSequences(sequences);
                                points = sequences.reduce((prev, sequence) => prev = prev + sequence.cells.length, 0);
                            }
                        }

                        this.grid[y][x].selected = false;
                        this.grid[this.selected.y][this.selected.x].selected = false;
                        this.selected = null;
                        this.loop();
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

    loop() {
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

    async findAndRemoveAllSequences() {
        for (let r = 0; r < CONSTS.ROWS; r++) {
            const row = this.grid[r];
            for (let c = 0; c < CONSTS.COLS; c++) {
                const cell = row[c];

                let sequenceH = 1;
                let walkingC = c + 1;
                while (walkingC < CONSTS.COLS && row[walkingC].color === cell.color) {
                    sequenceH = sequenceH + 1;
                    walkingC = walkingC + 1;
                }

                let sequenceV = 1;
                let walkingR = r + 1;
                while (walkingR < CONSTS.ROWS && this.grid[walkingR][c].color === cell.color) {
                    sequenceV = sequenceV + 1;
                    walkingR = walkingR + 1;
                }

                if (sequenceH >= 3) {
                    for (let index = 0; index < sequenceH; index++) {
                        this.grid[r][c + index] = null;
                    }
                    for (let index = 0; index < sequenceH; index++) {
                        await this.pullRow(r, c + index, false);
                    }
                }
                if (sequenceV >= 3) {
                    for (let index = 0; index < sequenceV; index++) {
                        this.grid[r + index][c] = null;
                    }
                    for (let index = 0; index < sequenceV; index++) {
                        await this.pullRow(r + index, c, false);
                    }
                }

                if (sequenceH >= 3 || sequenceV >= 3) {
                    return await this.findAndRemoveAllSequences();
                }
            }
        }
        this.loop();
    }

    /**
     * 
     * @param {{ col: number, row: number }} cell 
     * 
     */
    checkCell(cell, sequencesMade = []) {
        if (!this.grid[cell.row][cell.col]) return [];
        const color = this.grid[cell.row][cell.col].color;
        const sequences = [];

        // sequencia vertical
        let pointer = { row: cell.row, col: cell.col };
        while (pointer.row > 0 && this.grid[pointer.row - 1][pointer.col] && this.grid[pointer.row][pointer.col].color === this.grid[pointer.row - 1][pointer.col].color) {
            pointer.row = pointer.row - 1;
        }
        
        const sameVerticalSequence = sequencesMade
                .filter(sequence => sequence.direction === 'vertical')
                .find(sequence => sequence.cells[0].row === pointer.row && sequence.cells[0].col === pointer.col);
        if (!sameVerticalSequence) {
            let sequenceCells = [{
                row: pointer.row,
                col: pointer.col
            }];
            while (pointer.row + 1 < CONSTS.ROWS && this.grid[pointer.row + 1][pointer.col] && this.grid[pointer.row + 1][pointer.col].color === color) {
                sequenceCells.push({
                    row: pointer.row + 1,
                    col: pointer.col
                });
                pointer.row = pointer.row + 1;
            }
            if (sequenceCells.length >= 3) {
                console.log(`${color} vertical sequence of ${sequenceCells.length} from (${pointer.row + 1}, ${pointer.col + 1})`);
                sequences.push({
                    cells: sequenceCells,
                    direction: 'vertical'
                });
            }
        }


        // sequencia horizontal
        pointer = { row: cell.row, col: cell.col };
        while (pointer.col > 0 && this.grid[pointer.row][pointer.col - 1] && this.grid[pointer.row][pointer.col].color === this.grid[pointer.row][pointer.col - 1].color) {
            pointer.col = pointer.col - 1;
        }

        const sameHorizontalSequence = sequencesMade
            .filter(sequence => sequence.direction === 'horizontal')
            .find(sequence => sequence.cells[0].row === pointer.row && sequence.cells[0].col === pointer.col);
        if (!sameHorizontalSequence) {
            let sequenceCells = [{
                row: pointer.row,
                col: pointer.col
            }];
    
            while (pointer.col + 1 < CONSTS.COLS && this.grid[cell.row][pointer.col + 1] && this.grid[cell.row][pointer.col + 1].color === color) {
                sequenceCells.push({
                    row: pointer.row,
                    col: pointer.col + 1
                });
                pointer.col = pointer.col + 1;
            }
    
            if (sequenceCells.length >= 3) {
                console.log(`${color} horizontal sequence of ${sequenceCells.length} from (${pointer.row + 1}, ${pointer.col + 1})`);
                sequences.push({
                    cells: sequenceCells,
                    direction: 'horizontal'
                });
            }
        }
        return sequences;
    }

    async clenSequences(sequences, timeout = true) {
        for (const sequence of sequences) {
            for (const cell of sequence.cells) {
                this.grid[cell.row][cell.col] = null;
            }
        }
        if (timeout) {
            this.loop();
            await sleep(150);
        }
    }

    async pullRow(row, col, timeout = true) {
        if (this.grid[row][col]) return [];
        let newCells = 1;
        let cellsModified = [];
        let pointer = row;
        outer:
        while (pointer - newCells >= 0) {
            while (this.grid[pointer - newCells][col] === null) {
                newCells = newCells + 1;
                if (pointer - newCells <= 0) break outer;
            }
            this.grid[pointer][col] = this.grid[pointer - newCells][col];
            cellsModified.push({ col, row: pointer });
            pointer = pointer - newCells;
            this.loop();
        }

        for (let index = pointer; index < newCells; index++) {
            this.grid[index][col] = new Cell();
            cellsModified.push({ col, row: index });
        }
        
        if (timeout) {
            this.loop();
            await sleep(150);
        }
        return cellsModified;
    }
}

const canvas = document.querySelector('canvas#game');
const pointsLabel = document.querySelector('p#points');

let game = new Game(canvas);
game.onPointsScored = (points) => {
    pointsLabel.innerHTML = `${points} pontos`;
};
game.start();

function restart() {
    pointsLabel.innerHTML = `0 pontos`;
    game = new Game(canvas);
    game.onPointsScored = (points) => {
        pointsLabel.innerHTML = `${points} pontos`;
    };
    game.start();
}

function back() {
    game.grid = game.prevState;
    game.loop();
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
