// Константы модели
const C = 0.15;
const S = 0.01;
const RHO = 1.29;
const G = 9.81;

// Моделирование (метод Эйлера по заданной схеме)
function simulate(dt, v0, mass, angleDeg) {
  const k = (C * S * RHO) / (2 * mass);
  const angleRad = (angleDeg * Math.PI) / 180;
  let vx = v0 * Math.cos(angleRad);
  let vy = v0 * Math.sin(angleRad);
  let x = 0,
    y = 0;
  const xs = [x],
    ys = [y];

  while (y >= 0) {
    const v = Math.hypot(vx, vy);
    vx = vx - k * vx * v * dt;
    vy = vy - (G + k * vy * v) * dt;
    x = x + vx * dt;
    y = y + vy * dt;
    xs.push(x);
    ys.push(y);
    if (xs.length > 50000) break;
  }

  let distance, maxHeight, speedEnd;
  const n = xs.length;
  if (n >= 2 && ys[n - 1] < 0) {
    const x1 = xs[n - 2],
      y1 = ys[n - 2];
    const x2 = xs[n - 1],
      y2 = ys[n - 1];
    const frac = y1 / (y1 - y2);
    distance = x1 + (x2 - x1) * frac;
    speedEnd = Math.hypot(vx, vy);
  } else {
    distance = xs[n - 1];
    speedEnd = Math.hypot(vx, vy);
  }
  maxHeight = Math.max(...ys);
  return { x: xs, y: ys, distance, maxHeight, speedEnd };
}

// ---------- График ----------
const ctx = document.getElementById("trajectoryChart").getContext("2d");
let chart;
let datasetCounter = 0;
const colorPalette = [
  "#e63946",
  "#1e6091",
  "#2d6a4f",
  "#b9792c",
  "#6a4c93",
  "#e67f22",
];

function initChart() {
  chart = new Chart(ctx, {
    type: "scatter",
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { title: { display: true, text: "x, м" }, beginAtZero: true },
        y: { title: { display: true, text: "y, м" }, beginAtZero: true },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `(${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`,
          },
        },
        legend: { display: true, position: "top" },
      },
    },
  });
}

function addTrajectory(dt, v0, mass, angleDeg, xData, yData) {
  const color = colorPalette[datasetCounter % colorPalette.length];
  const points = xData.map((x, i) => ({ x, y: yData[i] }));
  chart.data.datasets.push({
    label: `Δt=${dt.toFixed(3)}c, v₀=${v0} м/с, α=${angleDeg}°`,
    data: points,
    backgroundColor: color,
    borderColor: color,
    borderWidth: 1.5,
    pointRadius: 0.6,
    showLine: true,
    tension: 0,
  });
  chart.update();
  datasetCounter++;
}

// ---------- Таблица ----------
const tableBody = document.getElementById("tableBody");

function addTableRow(dt, v0, mass, angleDeg, distance, maxHeight, speedEnd) {
  const row = tableBody.insertRow();
  row.insertCell().textContent = dt.toFixed(4);
  row.insertCell().textContent = v0.toFixed(1);
  row.insertCell().textContent = mass.toFixed(2);
  row.insertCell().textContent = angleDeg.toFixed(1);
  row.insertCell().textContent = distance.toFixed(2);
  row.insertCell().textContent = maxHeight.toFixed(2);
  row.insertCell().textContent = speedEnd.toFixed(2);
}

function clearAll() {
  tableBody.innerHTML = "";
  chart.data.datasets = [];
  chart.update();
  datasetCounter = 0;
}

// ---------- Обработчики ----------
document.getElementById("runBtn").addEventListener("click", () => {
  const dt = parseFloat(document.getElementById("dt").value);
  const v0 = parseFloat(document.getElementById("v0").value);
  const mass = parseFloat(document.getElementById("mass").value);
  const angle = parseFloat(document.getElementById("angle").value);

  if (
    [dt, v0, mass, angle].some(isNaN) ||
    dt <= 0 ||
    v0 <= 0 ||
    mass <= 0 ||
    angle <= 0 ||
    angle >= 90
  ) {
    alert("Проверьте корректность введённых данных.");
    return;
  }
  if (dt > 0.8 && !confirm("Шаг >0.8 с может дать неустойчивость. Продолжить?"))
    return;

  const result = simulate(dt, v0, mass, angle);
  addTrajectory(dt, v0, mass, angle, result.x, result.y);
  addTableRow(
    dt,
    v0,
    mass,
    angle,
    result.distance,
    result.maxHeight,
    result.speedEnd,
  );
});

document.getElementById("clearBtn").addEventListener("click", clearAll);

// Инициализация
initChart();
