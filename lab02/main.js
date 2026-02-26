// Элементы ввода параметров
const rhoInput = document.getElementById("rho");
const cInput = document.getElementById("c");
const lambdaInput = document.getElementById("lambda");
const LInput = document.getElementById("L");
const T0Input = document.getElementById("T0");
const TleftInput = document.getElementById("Tleft");
const TrightInput = document.getElementById("Tright");
const tEndInput = document.getElementById("t_end");

// Дискретные значения шагов
const tauValues = [0.1, 0.01, 0.001, 0.0001];
const hValues = [0.1, 0.01, 0.001, 0.0001];

// Индексы для таблиц
const tauIndices = { 0.1: 0, 0.01: 1, 0.001: 2, 0.0001: 3 };
const hIndices = { 0.1: 0, 0.01: 1, 0.001: 2, 0.0001: 3 };

// Таблицы
const tempTbody = document.querySelector("#tempTable tbody");
const timeTbody = document.querySelector("#timeTable tbody");

// График
const ctx = document.getElementById("tempChart").getContext("2d");
let chart;

// Инициализация графика
function initChart() {
  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Температура (последний расчёт)",
          borderColor: "#dc3545",
          backgroundColor: "rgba(220,53,69,0.05)",
          data: [],
          borderWidth: 2,
          pointRadius: 1.5,
          tension: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "linear",
          title: { display: true, text: "x, м" },
          ticks: { stepSize: 0.01 },
        },
        y: {
          title: { display: true, text: "T, °C" },
          // min: 0, max: 100  // убрали фиксированные пределы
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `x = ${ctx.parsed.x.toFixed(4)} м, T = ${ctx.parsed.y.toFixed(2)} °C`,
          },
        },
      },
    },
  });
}

// Чтение параметров из полей ввода
function getParams() {
  return {
    rho: parseFloat(rhoInput.value),
    c: parseFloat(cInput.value),
    lambda: parseFloat(lambdaInput.value),
    L: parseFloat(LInput.value),
    T0: parseFloat(T0Input.value),
    Tleft: parseFloat(TleftInput.value),
    Tright: parseFloat(TrightInput.value),
    t_end: parseFloat(tEndInput.value),
  };
}

// Обновление ячейки таблицы
function setTableCell(tbody, rowIdx, colIdx, value, isTime = false) {
  const row = tbody.rows[rowIdx];
  if (!row) return;
  const cell = row.cells[colIdx + 1];
  if (cell) {
    cell.textContent = isTime ? value.toFixed(4) : value.toFixed(10);
    cell.classList.remove("empty");
  }
}

// Очистка таблиц
function clearTables() {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const cellTemp = tempTbody.rows[i]?.cells[j + 1];
      const cellTime = timeTbody.rows[i]?.cells[j + 1];
      if (cellTemp) {
        cellTemp.textContent = "—";
        cellTemp.classList.add("empty");
      }
      if (cellTime) {
        cellTime.textContent = "—";
        cellTime.classList.add("empty");
      }
    }
  }
  chart.data.datasets[0].data = [];
  chart.update();
}

// Метод прогонки с параметрами
function solveHeat(tau, h, params) {
  const { rho, c, lambda, L, T0, Tleft, Tright, t_end } = params;

  const N = Math.floor(L / h) + 1; // число узлов сетки
  const nt = Math.ceil(t_end / tau); // число шагов по времени

  // Коэффициенты
  const A = lambda / (h * h);
  const C = A;
  const B = 2 * A + (rho * c) / tau;

  // Массив температуры
  let T = new Array(N).fill(T0);
  T[0] = Tleft;
  T[N - 1] = Tright;

  // Прогоночные коэффициенты
  const alpha = new Array(N - 1);
  const beta = new Array(N - 1);
  alpha[0] = 0;
  beta[0] = T[0];

  for (let n = 0; n < nt; n++) {
    // Правая часть F_i
    const F = new Array(N - 1);
    for (let i = 1; i <= N - 2; i++) {
      F[i] = -((rho * c) / tau) * T[i];
    }

    // Прямая прогонка
    for (let i = 1; i <= N - 2; i++) {
      const denom = B - C * alpha[i - 1];
      alpha[i] = A / denom;
      beta[i] = (C * beta[i - 1] - F[i]) / denom;
    }

    // Обратная прогонка
    T[N - 1] = Tright;
    for (let i = N - 2; i >= 1; i--) {
      T[i] = alpha[i] * T[i + 1] + beta[i];
    }
    T[0] = Tleft;
  }

  return T;
}

// Обработчик расчёта
document.getElementById("runBtn").addEventListener("click", function () {
  const tau = parseFloat(document.getElementById("tauSelect").value);
  const h = parseFloat(document.getElementById("hSelect").value);
  const params = getParams();

  // Проверка корректности параметров
  for (let key in params) {
    if (
      isNaN(params[key]) ||
      (params[key] <= 0 && key !== "Tleft" && key !== "Tright")
    ) {
      alert(
        "Проверьте значения параметров (должны быть положительными числами).",
      );
      return;
    }
  }

  const rowIdx = tauIndices[tau];
  const colIdx = hIndices[h];
  if (rowIdx === undefined || colIdx === undefined) {
    alert("Неверный выбор шага");
    return;
  }

  const startTime = performance.now();
  const T_profile = solveHeat(tau, h, params);
  const elapsed = (performance.now() - startTime) / 1000;

  const N = T_profile.length;
  const centerIdx = Math.floor(N / 2);
  const T_center = T_profile[centerIdx];

  setTableCell(tempTbody, rowIdx, colIdx, T_center, false);
  setTableCell(timeTbody, rowIdx, colIdx, elapsed, true);

  // Обновление графика
  const xs = [];
  const ys = [];
  for (let i = 0; i < N; i++) {
    xs.push(i * h);
    ys.push(T_profile[i]);
  }
  chart.data.datasets[0].data = xs.map((x, idx) => ({ x, y: ys[idx] }));
  chart.data.datasets[0].label = `τ = ${tau} с, h = ${h} м, время = ${elapsed.toFixed(3)} с`;
  chart.update();
});

// Очистка по кнопке
document.getElementById("clearBtn").addEventListener("click", clearTables);

// Сброс таблиц при изменении любого параметра (чтобы избежать несоответствия данных)
const paramInputs = [
  rhoInput,
  cInput,
  lambdaInput,
  LInput,
  T0Input,
  TleftInput,
  TrightInput,
  tEndInput,
];
paramInputs.forEach((input) => {
  input.addEventListener("input", clearTables);
});

// Инициализация
initChart();
