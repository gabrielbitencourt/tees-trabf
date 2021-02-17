const gameCanvas = document.querySelector('canvas#game');
const pointsLabel = document.querySelector('p#points');
const menuDiv = document.querySelector('div#menu');

let settings = {
    rows: window.screen.availWidth > 500 ? CONSTS.ROWS : 6,
    cols: window.screen.availWidth > 500 ? CONSTS.COLS : 6,
    colors: window.screen.availWidth > 500 ? CONSTS.CELL_COLORS.length : 5,
};
let game = new Game(gameCanvas, settings);
game.onPointsScored = (points) => {
    pointsLabel.innerHTML = `${points} pontos`;
};

const timerLabel = document.querySelector('p#timer');
function tickTimer() {
    timerLabel.innerHTML = `${(Date.now() - start) / 1000}s`;
}

game.start();
let start = Date.now();
let timerInterval = setInterval(tickTimer, 100);

function restart() {
    savePoints();
    pointsLabel.innerHTML = `0 pontos`;
    game = new Game(gameCanvas, settings);
    game.onPointsScored = (points) => {
        pointsLabel.innerHTML = `${points} pontos`;
    };
    game.start();
    start = Date.now();
}

function savePoints() {
    if (game.points > 0) {
        const ranking = JSON.parse(localStorage.getItem('ranking') || '[]');
        ranking.push(game.points);
        ranking.sort().reverse();
        localStorage.setItem('ranking', JSON.stringify(ranking));
        updateRanking();
    }
}

function updateRanking() {
    const rankings = document.querySelectorAll('li.ranking');
    for (let index = 0; index < rankings.length; index++) {
        const element = rankings[index];
        if (index == rankings.length - 1) {
            const placeholder = document.createElement('li');
            placeholder.id = 'ranking';
            element.replaceWith(placeholder);
        }
        else element.remove();
    }

    const ranking = JSON.parse(localStorage.getItem('ranking') || '[]');
    const els = [];
    if (!ranking.length) {
        els.push(document.createElement('li'));
        els[0].innerHTML = '<p class="full">Não há pontuações salvas.</p>';
        els[0].classList.add('ranking');
    }
    for (const points of ranking.slice(0, 3)) {
        const el = document.createElement('li');
        el.innerHTML = `<p class="full">${els.length + 1}º - ${points} pontos</p>`;
        el.classList.add('ranking');
        els.push(el);
    }
    const li = document.querySelector('li#ranking');
    li.replaceWith(...els);
}

function clearRanking() {
    localStorage.removeItem('ranking');
}

function toggleMenu() {
    menuDiv.classList.toggle('hidden');
}

const colorsLabel = document.querySelector('p#colors');
colorsLabel.innerHTML = `${settings.colors} cores`;
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
rowsLabel.innerHTML = `${settings.rows} linhas`;
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
colsLabel.innerHTML = `${settings.cols} colunas`;
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

updateRanking();
