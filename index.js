const gameCanvas = document.querySelector('canvas#game');
const pointsLabel = document.querySelector('p#points');
const menuDiv = document.querySelector('div#menu');

let settings = {
    rows: CONSTS.ROWS,
    cols: CONSTS.COLS,
    colors: CONSTS.CELL_COLORS.length,
};
let game = new Game(gameCanvas, settings);
game.onPointsScored = (points) => {
    pointsLabel.innerHTML = `${points} pontos`;
};
game.start();

function restart() {
    pointsLabel.innerHTML = `0 pontos`;
    game = new Game(gameCanvas, settings);
    game.onPointsScored = (points) => {
        pointsLabel.innerHTML = `${points} pontos`;
    };
    game.start();
}

function toggleMenu() {
    menuDiv.classList.toggle('hidden');
}

const colorsLabel = document.querySelector('p#colors');
function removeColor() {
    if (settings.colors > 3) settings.colors = settings.colors - 1;
    else alert("O mínimo de cores permitido é de 3.");
    colorsLabel.innerHTML = `${settings.colors} cores`;

}

function addColor() {
    if (settings.colors < CONSTS.CELL_COLORS.length) settings.colors = settings.colors + 1;
    else alert(`O máximo de cores permitido é de ${CONSTS.CELL_COLORS.length}.`);
    colorsLabel.innerHTML = `${settings.colors} cores`;
}

const rowsLabel = document.querySelector('p#rows');
function removeRow() {
    if (settings.rows > 3) settings.rows = settings.rows - 1;
    else alert("O mínimo de linhas permitido é de 3.");
    rowsLabel.innerHTML = `${settings.rows} linhas`;
}

function addRow() {
    if (settings.rows < 20) settings.rows = settings.rows + 1;
    else alert("O máximo de linhas permitido é de 20.");
    rowsLabel.innerHTML = `${settings.rows} linhas`;
}

const colsLabel = document.querySelector('p#cols');
function removeCol() {
    if (settings.cols > 3) settings.cols = settings.cols - 1;
    else alert("O mínimo de colunas permitido é de 3.");
    colsLabel.innerHTML = `${settings.cols} colunas`;
}

function addCol() {
    if (settings.cols < 20) settings.cols = settings.cols + 1;
    else alert("O máximo de colunas permitido é de 20.");
    colsLabel.innerHTML = `${settings.cols} colunas`;
}
