// Физические параметры (по условию)
const rho = 7800.0; // кг/м³
const c = 460.0; // Дж/(кг·°С)
const lambda = 46.0; // Вт/(м·°С)
const L = 0.1; // м (толщина пластины)
const T0 = 100.0; // начальная температура, °C
const Tleft = 0.0;
const Tright = 0.0;
const t_end = 2.0; // время моделирования, с

// Дискретные значения шагов (в порядке возрастания)
const tauValues = [0.1, 0.01, 0.001, 0.0001];
const hValues = [0.1, 0.01, 0.001, 0.0001];

// Индексы для таблиц
const tauIndices = { 0.1: 0, 0.01: 1, 0.001: 2, 0.0001: 3 };
const hIndices = { 0.1: 0, 0.01: 1, 0.001: 2, 0.0001: 3 };

// Таблицы (tbody)
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
          min: 0,
          max: 100,
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

// Функция обновления ячейки таблицы
function setTableCell(tbody, rowIdx, colIdx, value, isTime = false) {
  const row = tbody.rows[rowIdx];
  if (!row) return;
  const cell = row.cells[colIdx + 1]; // +1 потому что первый столбец — заголовок τ
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
  // Очистить график
  chart.data.datasets[0].data = [];
  chart.update();
}

// Метод прогонки (неявная схема) согласно формулам из методички
function solveHeat(tau, h) {
  const N = Math.floor(L / h) + 1; // число узлов сетки
  const nt = Math.ceil(t_end / tau); // число шагов по времени

  // Коэффициенты (постоянные для всех внутренних узлов)
  const A = lambda / (h * h);
  const C = A;
  const B = 2 * A + (rho * c) / tau;

  // Массив температуры (текущий слой)
  let T = new Array(N).fill(T0);
  T[0] = Tleft;
  T[N - 1] = Tright;

  // Прогоночные коэффициенты (для внутренних узлов i=1..N-2)
  const alpha = new Array(N - 1); // будем использовать индексы от 0 до N-2, где alpha[i] соответствует α_{i+1}?
  const beta = new Array(N - 1); // удобнее сделать размер N, но будем аккуратны.
  // Чтобы соответствовать индексации из методички: α_i и β_i для i=1..N-2, где i – номер внутреннего узла.
  // При i=1 используем α_0, β_0 из левого граничного условия.
  // Введем alpha[0] и beta[0] для i=0 (фиктивные, соответствуют граничному условию)
  alpha[0] = 0;
  beta[0] = T[0]; // T_0 = α_0 * T_1 + β_0  => α_0=0, β_0=T_0

  // Цикл по времени
  for (let n = 0; n < nt; n++) {
    // Формируем правую часть F_i для внутренних узлов i=1..N-2
    const F = new Array(N - 1); // индекс i соответствует узлу i (1..N-2)
    for (let i = 1; i <= N - 2; i++) {
      F[i] = -((rho * c) / tau) * T[i];
    }

    // Прямая прогонка (вычисление α_i, β_i для i=1..N-2)
    for (let i = 1; i <= N - 2; i++) {
      const denom = B - C * alpha[i - 1];
      alpha[i] = A / denom;
      beta[i] = (C * beta[i - 1] - F[i]) / denom;
    }

    // Обратная прогонка (вычисление T_i на новом слое)
    // Сначала задаём правое граничное условие: T[N-1] = Tright
    T[N - 1] = Tright;
    for (let i = N - 2; i >= 1; i--) {
      T[i] = alpha[i] * T[i + 1] + beta[i];
    }
    // T[0] уже задано граничным условием
    T[0] = Tleft;
  }

  return T;
}

// Основной обработчик расчёта
document.getElementById("runBtn").addEventListener("click", function () {
  const tau = parseFloat(document.getElementById("tauSelect").value);
  const h = parseFloat(document.getElementById("hSelect").value);

  // Получаем индексы для таблиц
  const rowIdx = tauIndices[tau];
  const colIdx = hIndices[h];
  if (rowIdx === undefined || colIdx === undefined) {
    alert("Неверный выбор шага");
    return;
  }

  // Предупреждение для очень мелких шагов
  const warningDiv = document.getElementById("warning");
  if (tau <= 0.0001 && h <= 0.0001) {
    warningDiv.style.display = "block";
    warningDiv.textContent =
      "⚠️ Выбраны очень мелкие шаги (τ=0.0001, h=0.0001). Расчёт может занять несколько минут. Пожалуйста, подождите...";
  } else if (tau <= 0.0001 || h <= 0.0001) {
    warningDiv.style.display = "block";
    warningDiv.textContent =
      "⚠️ Выбран мелкий шаг. Расчёт может занять до минуты. Подождите...";
  } else {
    warningDiv.style.display = "none";
  }

  // Засекаем время
  const startTime = performance.now();

  // Выполняем расчёт
  const T_profile = solveHeat(tau, h);

  const elapsed = (performance.now() - startTime) / 1000; // в секундах

  // Скрываем предупреждение после расчёта
  warningDiv.style.display = "none";

  // Находим температуру в центре пластины (индекс ближайший к середине)
  const N = T_profile.length;
  const centerIdx = Math.floor(N / 2);
  const T_center = T_profile[centerIdx];

  // Обновляем таблицы
  setTableCell(tempTbody, rowIdx, colIdx, T_center, false);
  setTableCell(timeTbody, rowIdx, colIdx, elapsed, true);

  // Обновляем график
  const xs = [];
  const ys = [];
  for (let i = 0; i < N; i++) {
    xs.push(i * h);
    ys.push(T_profile[i]);
  }
  chart.data.datasets[0].data = xs.map((x, idx) => ({ x, y: ys[idx] }));
  chart.data.datasets[0].label = `τ = ${tau} с, h = ${h} м, время счёта = ${elapsed.toFixed(3)} с`;
  chart.update();
});

// Очистка
document.getElementById("clearBtn").addEventListener("click", function () {
  clearTables();
});

// Инициализация
initChart();
