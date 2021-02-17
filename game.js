const CONSTS = {
    ROWS: 10,
    COLS: 10,
    CELL_SIZE: 50,
    CELL_COLORS: ['red', 'green', 'blue', 'yellow', 'purple', 'pink', 'cyan'],
    COLORS: {
        grid: "#E3D54F",
        background: "#6433D7",
        selected: '#E0E0E0',
        red: "#a31621",
        green: "#519872",
        blue: "#01357A",
        yellow: "#F8BD25",
        purple: "#281551",
        pink: "#fb6376",
        cyan: "#5DBBD5"
    }

};

/**
 * Representa célula do tabuleiro do jogo
 */
class Cell {
    /**
     * 
     * @param {number} max Número de cores do jogo
     */
    constructor(max = CONSTS.CELL_COLORS.length) {
        this.color = CONSTS.COLORS[CONSTS.CELL_COLORS[Math.floor(Math.random() * max)]];
        this.selected = false;
    }
}

/**
 * Representa estado do jogo
 */
class Game {
    
    /**
     * 
     * @param {HTMLCanvasElement} canvas Elemento html \<canvas\>
     * @param {{rows: number?, cols: number?, colors: number?}} settings Configurações do jogo
     */
    constructor(canvas, settings) {
        this.canvas = canvas;
        this.settings = {
            rows: CONSTS.ROWS,
            cols: CONSTS.COLS,
            colors: CONSTS.CELL_COLORS.slice(),
            ...settings
        };
        this.ctx = this.canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        this.offsetX = (this.canvas.width - (this.settings.cols * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.offsetY = (this.canvas.height - (this.settings.rows * CONSTS.CELL_SIZE + 1) - 1) / 2;

        this.bounds = {
            minX: this.offsetX,
            minY: this.offsetY,
            maxX: this.offsetX + (this.settings.cols * (CONSTS.CELL_SIZE + 1)),
            maxY: this.offsetY + (this.settings.rows * (CONSTS.CELL_SIZE + 1))
        };

        this.frame = null;
        this.running = false;

        this.grid = new Array(this.settings.rows);
        this.grid.fill([]);

        this.grid = this.grid.map(() => {
            const row = new Array(new Cell(this.settings.colors));
            for (let c = 0; c < this.settings.cols; c++) {
                row[c] = new Cell(this.settings.colors);
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

        this.drawGrid(false);
        this.findSequences();
    }

    /**
     * Dá início ao jogo e seta os callbacks de resize e click
     */
    start() {
        this.running = true;
        window.onresize = this.resizeHandler;
        this.canvas.onclick = this.clickHandler;
        this.draw();
    }

    /**
     * Limpa o canvas para desenhar novo frame
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
    }

    /**
     * Função que é executada quando o tamanho da janela muda
     */
    resizeHandler() {
        gameCanvas.width = window.innerWidth;
        gameCanvas.height = window.innerHeight;

        this.offsetX = (this.canvas.width - (this.settings.cols * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.offsetY = (this.canvas.height - (this.settings.rows * CONSTS.CELL_SIZE + 1) - 1) / 2;
        this.bounds = {
            minX: this.offsetX,
            minY: this.offsetY,
            maxX: this.offsetX + (this.settings.cols * (CONSTS.CELL_SIZE + 1)),
            maxY: this.offsetY + (this.settings.rows * (CONSTS.CELL_SIZE + 1))
        };
        this.draw();
    }

    /**
     * Função que trata os cliques do usuário no jogo
     * @param {MouseEvent} ev Evento do clique
     */
    async clickHandler(ev) {
        if (ev.clientX > this.bounds.minX && ev.clientX < this.bounds.maxX && ev.clientY > this.bounds.minY && ev.clientY < this.bounds.maxY) {
            const col = Math.floor((ev.clientX - this.bounds.minX) / CONSTS.CELL_SIZE);
            const row = Math.floor((ev.clientY - this.bounds.minY) / CONSTS.CELL_SIZE);

            if (!this.selected) {
                this.selectCell(row, col);
            }
            else {
                if (this.grid[row][col].selected === false) {
                    // as duas células selecionadas devem estar na mesma linha ou na mesma coluna
                    if ((col === this.selected.col && Math.abs(row - this.selected.row) === 1) || (row === this.selected.row && Math.abs(col - this.selected.col) === 1)) {
                        this.selectCell(row, col);
                        const temp = this.grid[row][col];
                        this.grid[row][col] = this.grid[this.selected.row][this.selected.col];
                        this.grid[this.selected.row][this.selected.col] = temp;
                        
                        this.draw();
                        let sequences = this.findSequencesFromCell(row, col);
                        sequences.push(...this.findSequencesFromCell(this.selected.row, this.selected.col, sequences));
                        await this.cleanSequences(sequences);

                        let points = sequences.reduce((prev, sequence) => prev = prev + sequence.cells.length, 0);
                        // não realiza movimento se ele não criar nova sequência
                        if (points === 0) {
                            this.grid[this.selected.row][this.selected.col] = this.grid[row][col];
                            this.grid[row][col] = temp;
                        }
                        else {
                            // enquanto novas sequências forem identificadas
                            // pontua, cria novas células, busca novas sequências
                            while (sequences.length) {
                                this.draw();
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

                                sequences = [];
                                for (const modifiedCell of cellsModified) {
                                    this.draw();
                                    const newSequences = this.findSequencesFromCell(modifiedCell.row, modifiedCell.col, sequences);
                                    sequences.push(...newSequences);
                                }
                                await this.cleanSequences(sequences);
                                points = sequences.reduce((prev, sequence) => prev = prev + sequence.cells.length, 0);
                            }
                        }

                        this.deselectCell(this.selected.row, this.selected.col);
                        this.deselectCell(row, col);
                        this.draw();
                    }
                    else {
                        console.error('Jogada não permitida.');
                    }
                }
                else {
                    this.deselectCell(row, col);
                }
            }
        }
        this.draw();
    }

    /**
     * Limpa e redesenha o tabuleiro
     */
    draw() {
        this.clear();
        this.ctx.beginPath();
        this.drawGrid(false);
    }

    /**
     * Desenha no canvas as linhas e formas do jogo
     */
    drawGrid(grid = true) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONSTS.COLORS.grid;
        this.ctx.fillStyle = CONSTS.COLORS.background;

        this.ctx.rect(this.offsetX + 1, this.offsetY + 1, (CONSTS.CELL_SIZE + 1) * this.settings.cols - 2, (CONSTS.CELL_SIZE + 1) * this.settings.rows - 2)
        this.ctx.fill();

        if (grid) {
            this.ctx.beginPath();

            // horizontal lines
            for (let i = 0; i <= this.settings.cols; i++) {
                const fixedX = i * (CONSTS.CELL_SIZE + 1) + this.offsetX;
                this.ctx.moveTo(fixedX, this.offsetY);
                this.ctx.lineTo(fixedX, (CONSTS.CELL_SIZE + 1) * this.settings.rows + this.offsetY);
            }
        
            // vertical lines
            for (let j = 0; j <= this.settings.rows; j++) {
                const fixedY = j * (CONSTS.CELL_SIZE + 1) + this.offsetY;
                this.ctx.moveTo(this.offsetX, fixedY);
                this.ctx.lineTo((CONSTS.CELL_SIZE + 1) * this.settings.cols + this.offsetX, fixedY);
            }
        
            this.ctx.stroke();
        }

        for (let r = 0; r < this.settings.rows; r++) {
            for (let c = 0; c < this.settings.cols; c++) {
                const cell = this.grid[r][c];
                if (cell) {
                    const x = this.offsetX + (c * (CONSTS.CELL_SIZE + 1)) + ((CONSTS.CELL_SIZE + 1) / 2);
                    const y = this.offsetY + (r * (CONSTS.CELL_SIZE + 1)) + ((CONSTS.CELL_SIZE + 1) / 2);
                    this.drawCircle(x, y, cell.color, cell.selected);
                }
            }
        }
    }

    /**
     * Desenha círculos no canvas
     * @param {number} x Coordenada x da célular
     * @param {number} y Coordenada y da célular
     * @param {'red' | 'green' | 'blue' | 'yellow' | 'purple' | 'pink' | 'cyan'} fill Cor da célula
     * @param {boolean} selected Se célula está selecionada
     * @param {number} r Raio da célula
     */
    drawCircle(x, y, fill, selected, r = (CONSTS.CELL_SIZE - 6) / 2) {
        if (selected) {
            this.ctx.fillStyle = CONSTS.COLORS.selected;
            const cellX = x - (CONSTS.CELL_SIZE / 2);
            const cellY = y - (CONSTS.CELL_SIZE / 2);
            this.ctx.beginPath();
            this.ctx.rect(cellX, cellY, CONSTS.CELL_SIZE, CONSTS.CELL_SIZE);
            this.ctx.fill();
        }
        this.ctx.fillStyle = fill;
        this.ctx.beginPath();
        this.ctx.arc(x, y, r, 0, 2 * Math.PI);
        this.ctx.fill();
    }

    /**
     * 
     * @param {{row: number, col: number}[]} cells 
     */
    drawSequenceRemoved(cells) {
        for (const cell of cells) {
            if (this.grid[cell.row][cell.col]) {
                this.ctx.fillStyle = this.grid[cell.row][cell.col].color;
                const x = this.offsetX + cell.col * (CONSTS.CELL_SIZE + 1);
                const y = this.offsetY + cell.row * (CONSTS.CELL_SIZE + 1);
                this.ctx.beginPath();
                this.ctx.rect(x, y, CONSTS.CELL_SIZE + 1, CONSTS.CELL_SIZE + 1);
                this.ctx.fill();
            }
        }
    }

    deselectCell(row, col) {
        this.grid[row][col].selected = false;
        this.selected = null;
    }

    selectCell(row, col) {
        this.grid[row][col].selected = true;
        if (!this.selected) this.selected = { row, col };
    }

    /**
     * Busca todas as sequências célula por célula, sem pontuar e sem "animções".
     * Usada na geração do primeiro tabuleiro.
     * @param {boolean} remove Remover sequências encontradas ou não
     * @returns {Promise<boolean?>}
     * @todo otimizar e organizar função
     */
    async findSequences(remove = true) {
        for (let r = 0; r < this.settings.rows; r++) {
            const row = this.grid[r];
            for (let c = 0; c < this.settings.cols; c++) {
                const cell = row[c];

                let sequenceH = 1;
                let walkingC = c + 1;
                while (walkingC < this.settings.cols && row[walkingC].color === cell.color) {
                    sequenceH = sequenceH + 1;
                    walkingC = walkingC + 1;
                }

                let sequenceV = 1;
                let walkingR = r + 1;
                while (walkingR < this.settings.rows && this.grid[walkingR][c].color === cell.color) {
                    sequenceV = sequenceV + 1;
                    walkingR = walkingR + 1;
                }

                if (remove) {
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
                }

                if (sequenceH >= 3 || sequenceV >= 3) {
                    if (remove) return await this.findSequences(remove);
                    return true;
                }
            }
        }
        if (remove) return this.draw();
        return false;
    }

    /**
     * Procura sequências que a célula faz parte
     * @param {number} row Linha da célula a ser checada
     * @param {number} col Coluna da célula a ser checada
     * @param {{cells: { col: number, row: number }[], direction: 'horizontal' | 'vertical'}[]} sequencesMade Sequências já verificadas na passagem atual
     * 
     * @returns {{cells: { col: number, row: number }[], direction: 'horizontal' | 'vertical'}[]} Novas sequências
     */
    findSequencesFromCell(row, col, sequencesMade = []) {
        if (!this.grid[row][col]) return [];
        const color = this.grid[row][col].color;
        const sequences = [];

        // sequências verticais
        let pointer = { row, col };
        while (pointer.row > 0 && this.grid[pointer.row - 1][pointer.col] && this.grid[pointer.row][pointer.col].color === this.grid[pointer.row - 1][pointer.col].color) {
            pointer.row = pointer.row - 1;
        }
        
        // se já tem outra sequência vertical que começou na mesma célula,
        // não há necessidade de verificar novamente
        const sameVerticalSequence = sequencesMade
                .filter(sequence => sequence.direction === 'vertical')
                .find(sequence => sequence.cells[0].row === pointer.row && sequence.cells[0].col === pointer.col);
        if (!sameVerticalSequence) {
            let sequenceCells = [{
                row: pointer.row,
                col: pointer.col
            }];
            while (pointer.row + 1 < this.settings.rows && this.grid[pointer.row + 1][pointer.col] && this.grid[pointer.row + 1][pointer.col].color === color) {
                sequenceCells.push({
                    row: pointer.row + 1,
                    col: pointer.col
                });
                pointer.row = pointer.row + 1;
            }
            if (sequenceCells.length >= 3) {
                // console.log(`${color} vertical sequence of ${sequenceCells.length} from (${pointer.row + 1}, ${pointer.col + 1})`);
                sequences.push({
                    cells: sequenceCells,
                    direction: 'vertical'
                });
            }
        }


        // sequências horizontais
        pointer = { row, col };
        while (pointer.col > 0 && this.grid[pointer.row][pointer.col - 1] && this.grid[pointer.row][pointer.col].color === this.grid[pointer.row][pointer.col - 1].color) {
            pointer.col = pointer.col - 1;
        }

        // se já tem outra sequência horizontal que começou na mesma célula,
        // não há necessidade de verificar novamente
        const sameHorizontalSequence = sequencesMade
            .filter(sequence => sequence.direction === 'horizontal')
            .find(sequence => sequence.cells[0].row === pointer.row && sequence.cells[0].col === pointer.col);
        if (!sameHorizontalSequence) {
            let sequenceCells = [{
                row: pointer.row,
                col: pointer.col
            }];
    
            while (pointer.col + 1 < this.settings.cols && this.grid[row][pointer.col + 1] && this.grid[row][pointer.col + 1].color === color) {
                sequenceCells.push({
                    row: pointer.row,
                    col: pointer.col + 1
                });
                pointer.col = pointer.col + 1;
            }
    
            if (sequenceCells.length >= 3) {
                // console.log(`${color} horizontal sequence of ${sequenceCells.length} from (${pointer.row + 1}, ${pointer.col + 1})`);
                sequences.push({
                    cells: sequenceCells,
                    direction: 'horizontal'
                });
            }
        }
        return sequences;
    }

    /**
     * Limpa sequências formadas
     * @param {{cells: { col: number, row: number }[], direction: 'horizontal' | 'vertical'}[]} sequences Sequências que serão limpas do tabuleiro
     * @param {boolean} timeout Se será "animado" ou não
     */
    async cleanSequences(sequences, timeout = true) {
        for (const sequence of sequences) {
            if (timeout) {
                this.drawSequenceRemoved(sequence.cells);
                await wait(300);
            }
            for (const cell of sequence.cells) {
                this.grid[cell.row][cell.col] = null;
            }
        }
        if (timeout) {
            await wait(400);
            this.draw();
            await wait(150);
        }
    }

    /**
     * Cria novas células e puxa células de cima para espaços vazios em baixo
     * @param {number} row Linha da célula a ser tratada
     * @param {number} col Coluna da célula a ser tratada
     * @param {boolean} timeout Se será "animado" ou não
     */
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
            this.draw();
        }

        for (let index = pointer; index < newCells; index++) {
            this.grid[index][col] = new Cell(this.settings.colors);
            cellsModified.push({ col, row: index });
        }
        
        if (timeout) {
            this.draw();
            await wait(150);
        }
        return cellsModified;
    }
}

async function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}