// Элементы панели параметров
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const densityInput = document.getElementById("density");
const growProbInput = document.getElementById("growProb");
const spreadProbInput = document.getElementById("spreadProb");
const windDirSelect = document.getElementById("windDir");
const windFactorInput = document.getElementById("windFactor");
const lightningProbInput = document.getElementById("lightningProb");
const speedInput = document.getElementById("speed");
// Элементы панели управления симуляцией
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stepBtn = document.getElementById("stepBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");
const clearTableBtn = document.getElementById("clearTableBtn");
// Канвас для визуализации
const canvas = document.getElementById("forestCanvas");
const ctx = canvas.getContext("2d");
// Таблица для отображения результатов
const tableBody = document.getElementById("tableBody");
// Размерности поля
let grid = [];
let rows = 100;
let cols = 100;
// Интервал для анимации и флаг состояния симуляции
let animationInterval = null;
let running = false;
// Состояние автомата
const EMPTY = 0;
const TREE = 1;
const FIRE = 2;
// Цвета клеток для визуализации состояний
const colors = [
  "#cdb38c", // пусто
  "#2e7d32", // дерево
  "#d32f2f", // огонь
];
/** Инициализация поля с заданной плотностью деревьев
 * @param {*} density
 */
function initRandom(density) {
  rows = parseInt(heightInput.value);
  cols = parseInt(widthInput.value);
  grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push(Math.random() < density ? TREE : EMPTY);
    }
    grid.push(row);
  }
  resizeCanvas();
  draw();
}
/** Настройка размера канваса в зависимости от размеров поля и размера клетки
 */
function resizeCanvas() {
  const cellSize = 5;
  canvas.width = cols * cellSize;
  canvas.height = rows * cellSize;
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
}
/** Отрисовка поля на канвасе
 */
function draw() {
  const cellSize = 5;
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  const data = imageData.data;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const state = grid[r][c];
      const color = colors[state];
      let rCol = parseInt(color.slice(1, 3), 16);
      let gCol = parseInt(color.slice(3, 5), 16);
      let bCol = parseInt(color.slice(5, 7), 16);
      for (let dy = 0; dy < cellSize; dy++) {
        for (let dx = 0; dx < cellSize; dx++) {
          const x = c * cellSize + dx;
          const y = r * cellSize + dy;
          const index = (y * canvas.width + x) * 4;
          data[index] = rCol;
          data[index + 1] = gCol;
          data[index + 2] = bCol;
          data[index + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
/** Получение соседних клеток для данной позиции
 * @param {*} r
 * @param {*} c
 * @returns
 */
function getNeighbors(r, c) {
  const neighbors = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        neighbors.push({ r: nr, c: nc, dr, dc });
      }
    }
  }
  return neighbors;
}
/** Проверка, соответствует ли направление от соседа к текущей клетке направлению ветра
 * @param {*} dr
 * @param {*} dc
 * @param {*} windDir
 * @returns
 * Возвращает множитель вероятности распространения огня в зависимости от ветра.
 *
 * - Если огонь приходит из стороны, противоположной ветру (т.е. ветер «дует» в
 *   ту же сторону, куда движется огонь), вероятность увеличивается.
 * - Если огонь приходит против ветра, вероятность уменьшается.
 */
function getWindMultiplier(dr, dc, windDir, windFactor) {
  if (windDir === "none" || windFactor === 1) return 1;
  const windVec = { N: [-1, 0], S: [1, 0], W: [0, -1], E: [0, 1] };
  const [windDr, windDc] = windVec[windDir] || [0, 0];

  // dr/dc — смещение от текущей клетки к соседней.
  // Если сосед находится позади (против ветра), огонь распространяется по ветру.
  if (dr === -windDr && dc === -windDc) {
    return windFactor;
  }

  // Если огонь приходит против ветра, ослабляем вероятность.
  if (dr === windDr && dc === windDc) {
    return 1 / windFactor;
  }

  return 1;
}
/** Выполнение одного шага симуляции
 */
function step() {
  const growProb = parseFloat(growProbInput.value);
  const spreadProb = parseFloat(spreadProbInput.value);
  const windDir = windDirSelect.value;
  const windFactor = parseFloat(windFactorInput.value);
  const lightningProb = parseFloat(lightningProbInput.value);

  // Молния
  if (Math.random() < lightningProb) {
    const treeCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === TREE) treeCells.push([r, c]);
      }
    }
    if (treeCells.length > 0) {
      const [r, c] = treeCells[Math.floor(Math.random() * treeCells.length)];
      grid[r][c] = FIRE;
    }
  }

  const newGrid = [];
  for (let r = 0; r < rows; r++) newGrid[r] = new Array(cols);

  // Основной цикл изменения состояний клеток
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const state = grid[r][c];
      if (state === FIRE) {
        newGrid[r][c] = EMPTY;
      } else if (state === EMPTY) {
        newGrid[r][c] = Math.random() < growProb ? TREE : EMPTY;
      } else if (state === TREE) {
        let catchesFire = false;
        const neighbors = getNeighbors(r, c);
        for (let n of neighbors) {
          if (grid[n.r][n.c] === FIRE) {
            let prob =
              spreadProb * getWindMultiplier(n.dr, n.dc, windDir, windFactor);
            if (Math.random() < prob) {
              catchesFire = true;
              break;
            }
          }
        }
        newGrid[r][c] = catchesFire ? FIRE : TREE;
      }
    }
  }

  grid = newGrid;
  draw();
}
/** Сброс симуляции с новой случайной инициализацией поля в зависимости от заданной плотности деревьев
 */
function reset() {
  const density = parseFloat(densityInput.value);
  initRandom(density);
}
/** Запуск анимации с заданной скоростью
 */
function startAnimation() {
  if (animationInterval) return;
  const speed = parseInt(speedInput.value);
  animationInterval = setInterval(step, speed);
  running = true;
}
/** Пауза анимации
 */
function pauseAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    running = false;
  }
}

let resultCounter = 0;
/** Сохранение текущих параметров и статистики по состоянию поля в таблицу результатов
 */
function saveResult() {
  resultCounter++;
  const width = parseInt(widthInput.value);
  const height = parseInt(heightInput.value);
  const density = parseFloat(densityInput.value);
  const growProb = parseFloat(growProbInput.value);
  const spreadProb = parseFloat(spreadProbInput.value);
  const windDir = windDirSelect.value;
  const windFactor = parseFloat(windFactorInput.value);
  const lightningProb = parseFloat(lightningProbInput.value);

  let treeCount = 0,
    fireCount = 0,
    emptyCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === TREE) treeCount++;
      else if (grid[r][c] === FIRE) fireCount++;
      else emptyCount++;
    }
  }
  const total = rows * cols;
  const treePct = ((treeCount / total) * 100).toFixed(1);
  const firePct = ((fireCount / total) * 100).toFixed(1);
  const emptyPct = ((emptyCount / total) * 100).toFixed(1);

  const row = tableBody.insertRow();
  row.insertCell().textContent = resultCounter;
  row.insertCell().textContent = width;
  row.insertCell().textContent = height;
  row.insertCell().textContent = density.toFixed(2);
  row.insertCell().textContent = growProb.toFixed(3);
  row.insertCell().textContent = spreadProb.toFixed(2);
  row.insertCell().textContent = windDir;
  row.insertCell().textContent = windFactor.toFixed(1);
  row.insertCell().textContent = lightningProb.toFixed(4);
  row.insertCell().textContent = treePct;
  row.insertCell().textContent = firePct;
  row.insertCell().textContent = emptyPct;
}
/** Очистка таблицы результатов
 */
function clearTable() {
  tableBody.innerHTML = "";
  resultCounter = 0;
}

startBtn.addEventListener("click", startAnimation);
pauseBtn.addEventListener("click", pauseAnimation);
stepBtn.addEventListener("click", () => {
  pauseAnimation();
  step();
});
resetBtn.addEventListener("click", () => {
  pauseAnimation();
  reset();
});
saveBtn.addEventListener("click", saveResult);
clearTableBtn.addEventListener("click", clearTable);

widthInput.addEventListener("change", () => {
  pauseAnimation();
  reset();
});
heightInput.addEventListener("change", () => {
  pauseAnimation();
  reset();
});
densityInput.addEventListener("change", () => {
  pauseAnimation();
  reset();
});

reset();
