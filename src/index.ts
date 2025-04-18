// Tetris game implemented in TypeScript
const canvas = document.getElementById('tetris') as HTMLCanvasElement;
const context = canvas.getContext('2d')!;
const gridWidth = 10;
const gridHeight = 20;
const scale = 20;
canvas.width = gridWidth * scale;
canvas.height = gridHeight * scale;
context.scale(scale, scale);
// Next piece preview setup
const nextCanvas = document.getElementById('next') as HTMLCanvasElement;
const nextContext = nextCanvas.getContext('2d')!;
const previewGridSize = 4;
nextCanvas.width = previewGridSize * scale;
nextCanvas.height = previewGridSize * scale;
nextContext.scale(scale, scale);
// Pieces and next piece state
const pieces = 'TJLOSZI';
let nextPiece = pieces[(pieces.length * Math.random()) | 0];

/** Draw the next piece in preview area */
function drawNext() {
  nextContext.fillStyle = '#000';
  nextContext.fillRect(0, 0, previewGridSize, previewGridSize);
  const matrix = createPiece(nextPiece);
  const offsetX = ((previewGridSize - matrix[0].length) / 2) | 0;
  const offsetY = ((previewGridSize - matrix.length) / 2) | 0;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        nextContext.fillStyle = colors[value]!;
        nextContext.fillRect(x + offsetX, y + offsetY, 1, 1);
      }
    });
  });
}
// Overlay and game state for title and game over
const overlay = document.getElementById('overlay') as HTMLDivElement;
let gameState: 'title' | 'playing' | 'gameover' = 'title';

/** Start or restart the game */
function startGame() {
  overlay.style.display = 'none';
  gameState = 'playing';
  // Reset game state
  arena.forEach(row => row.fill(0));
  score = 0;
  scoreElement.innerText = score.toString();
  dropCounter = 0;
  lastTime = 0;
  playerReset();
  requestAnimationFrame(update);
}

// Initial display of overlay (title screen)
overlay.style.display = 'flex';

type Matrix = number[][];
interface Player {
  pos: { x: number; y: number };
  matrix: Matrix;
}

const colors: (string | null)[] = [
  null,
  '#FF0D72',
  '#0DC2FF',
  '#0DFF72',
  '#F538FF',
  '#FF8E0D',
  '#FFE138',
  '#3877FF',
];

function createMatrix(w: number, h: number): Matrix {
  const matrix: Matrix = [];
  for (let y = 0; y < h; ++y) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type: string): Matrix {
  switch (type) {
    case 'T':
      return [
        [0, 0, 0],
        [1, 1, 1],
        [0, 1, 0],
      ];
    case 'O':
      return [
        [2, 2],
        [2, 2],
      ];
    case 'L':
      return [
        [0, 3, 0],
        [0, 3, 0],
        [0, 3, 3],
      ];
    case 'J':
      return [
        [0, 4, 0],
        [0, 4, 0],
        [4, 4, 0],
      ];
    case 'I':
      return [
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
        [0, 5, 0, 0],
      ];
    case 'S':
      return [
        [0, 6, 6],
        [6, 6, 0],
        [0, 0, 0],
      ];
    case 'Z':
      return [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0],
      ];
    default:
      throw new Error('Unknown piece type: ' + type);
  }
}

function drawMatrix(matrix: Matrix, offset: { x: number; y: number }) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value]!;
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function merge(arena: Matrix, player: Player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function collide(arena: Matrix, player: Player): boolean {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (
        m[y][x] !== 0 &&
        (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function arenaSweep() {
  if (isClearing) {
    return;
  }
  // Detect full rows
  const rows: number[] = [];
  for (let y = arena.length - 1; y > 0; --y) {
    if (arena[y].every(value => value !== 0)) {
      rows.push(y);
    }
  }
  if (rows.length === 0) {
    // No rows to clear: update score display and spawn next piece
    scoreElement.innerText = score.toString();
    playerReset();
    dropCounter = 0;
    return;
  }
  // Start clear animation (sort rows ascending for correct removal)
  isClearing = true;
  clearRows = rows.sort((a, b) => a - b);
  clearAnimationStart = lastTime;
}

let dropCounter = 0;
const dropInterval = 1000;
let lastTime = 0;
// Animation state for row clearing effect
let isClearing = false;
let clearRows: number[] = [];
let clearAnimationStart = 0;
const clearAnimationDuration = 400; // total animation time in ms
const clearBlinkInterval = 100; // blink interval in ms
let blinkState = false;

function update(time = 0) {
  if (gameState !== 'playing') {
    return;
  }
  const deltaTime = time - lastTime;
  lastTime = time;
  // Handle row clear animation timing
  if (isClearing) {
    const elapsed = time - clearAnimationStart;
    // Toggle blink state
    blinkState = Math.floor(elapsed / clearBlinkInterval) % 2 === 0;
    if (elapsed < clearAnimationDuration) {
      draw();
      requestAnimationFrame(update);
      return;
    } else {
      // End of animation: clear rows and reset state
      performRowClear();
      isClearing = false;
      blinkState = false;
      playerReset();
      dropCounter = 0;
    }
  }
  // Normal update (gravity, input)
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    arenaSweep();
    return;
  }
  dropCounter = 0;
}

function playerMove(dir: number) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function rotate(matrix: Matrix, dir: number) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function playerRotate(dir: number) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

document.addEventListener('keydown', event => {
  // Title or Game Over: Enter starts game
  if ((gameState === 'title' || gameState === 'gameover') && event.key === 'Enter') {
    startGame();
    return;
  }
  // Only handle input during play
  if (gameState !== 'playing' || isClearing) {
    return;
  }
  switch (event.key) {
    case 'ArrowLeft':
      playerMove(-1);
      break;
    case 'ArrowRight':
      playerMove(1);
      break;
    case 'ArrowDown':
      playerDrop();
      break;
    case 'q':
      playerRotate(-1);
      break;
    case 'w':
      playerRotate(1);
      break;
  }
});

const arena = createMatrix(gridWidth, gridHeight);
const player: Player = {
  pos: { x: 0, y: 0 },
  matrix: createMatrix(0, 0),
};

const scoreElement = document.getElementById('score')!;
let score = 0;

/**
 * Perform actual row clearing and scoring after animation.
 */
function performRowClear() {
  // Remove rows in ascending order to maintain correct indices
  const rowsToClear = clearRows.slice().sort((a, b) => a - b);
  let rowCount = 1;
  rowsToClear.forEach(y => {
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    rowCount *= 2;
    score += rowCount * 10;
  });
  scoreElement.innerText = score.toString();
  // Reset clearRows for next round
  clearRows = [];
}


function playerReset() {
  // Use nextPiece as the current tetromino
  const type = nextPiece;
  player.matrix = createPiece(type);
  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
  // Generate a new next piece and update preview
  nextPiece = pieces[(pieces.length * Math.random()) | 0];
  drawNext();
  // If the new piece collides immediately, trigger Game Over
  if (collide(arena, player)) {
    gameState = 'gameover';
    overlay.innerHTML = 'Game Over<br>Press Enter to Restart';
    overlay.style.display = 'flex';
    return;
  }
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, gridWidth, gridHeight);
  // Draw arena blocks
  drawMatrix(arena, { x: 0, y: 0 });
  // Draw blinking overlay for clearing rows
  if (isClearing && blinkState) {
    context.fillStyle = 'rgba(255,255,255,0.75)';
    clearRows.forEach(y => {
      for (let x = 0; x < gridWidth; ++x) {
        context.fillRect(x, y, 1, 1);
      }
    });
  }
  // Draw current piece only when not clearing
  if (!isClearing) {
    drawMatrix(player.matrix, player.pos);
  }
}