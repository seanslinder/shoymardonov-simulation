// ========== LCG генератор ==========
class CustomRNG {
  constructor(seed) {
    this.mod = 2147483647;
    this.mult = 16807;
    this.state = seed % this.mod;
    if (this.state === 0) this.state = 1;
  }

  next() {
    this.state = (this.mult * this.state) % this.mod;
    return this.state / this.mod;
  }
}

function getProbabilities() {
  const p = [
    parseFloat(document.getElementById("p1").value) || 0,
    parseFloat(document.getElementById("p2").value) || 0,
    parseFloat(document.getElementById("p3").value) || 0,
    parseFloat(document.getElementById("p4").value) || 0,
    parseFloat(document.getElementById("p5").value) || 0,
  ];
  const sum = p.reduce((a, b) => a + b, 0);
  if (sum === 0) return p.map(() => 0.2);
  return p.map((pi) => pi / sum);
}

function updateProbSum() {
  const p = getProbabilities();
  const sum = p.reduce((a, b) => a + b, 0);
  document.getElementById("sumProb").textContent = sum.toFixed(4);
}

document.getElementById("p1").addEventListener("input", updateProbSum);
document.getElementById("p2").addEventListener("input", updateProbSum);
document.getElementById("p3").addEventListener("input", updateProbSum);
document.getElementById("p4").addEventListener("input", updateProbSum);
document.getElementById("p5").addEventListener("input", updateProbSum);
updateProbSum();

// Дискретная СВ
function generateDiscreteSample(rng, probs, n) {
  const values = [1, 2, 3, 4, 5];
  const cumProbs = [];
  let sum = 0;
  for (let p of probs) {
    sum += p;
    cumProbs.push(sum);
  }
  const sample = [];
  for (let i = 0; i < n; i++) {
    const u = rng.next();
    let idx = 0;
    while (idx < cumProbs.length && u > cumProbs[idx]) idx++;
    sample.push(values[idx]);
  }
  return sample;
}

function computeDiscreteStats(sample, probs, n) {
  const freq = [0, 0, 0, 0, 0];
  for (let v of sample) freq[v - 1]++;
  const empProbs = freq.map((f) => f / n);
  const theorMean = probs.reduce((s, p, i) => s + p * (i + 1), 0);
  const theorVar = probs.reduce(
    (s, p, i) => s + p * (i + 1 - theorMean) ** 2,
    0,
  );
  const empMean = sample.reduce((a, b) => a + b, 0) / n;
  const empVar = sample.reduce((s, v) => s + (v - empMean) ** 2, 0) / n;
  const meanErrRel = calculateRelativeError(empMean, theorMean);
  const varErrRel = calculateRelativeError(empVar, theorVar);

  let chi2 = 0;
  let valid = true;
  for (let i = 0; i < 5; i++) {
    const expected = n * probs[i];
    if (expected < 5) valid = false;
    chi2 += (freq[i] - expected) ** 2 / expected;
  }
  const critical = 9.488; // χ²(0.05, df=4)
  const hypothesis = chi2 <= critical ? "принимается" : "отвергается";
  return {
    freq,
    empProbs,
    empMean,
    empVar,
    theorMean,
    theorVar,
    meanErrRel,
    varErrRel,
    chi2,
    hypothesis,
    valid,
  };
}

function runDiscrete(n) {
  const seed = parseInt(document.getElementById("discreteSeed").value) || 12345;
  const rng = new CustomRNG(seed);
  const probs = getProbabilities();
  const sample = generateDiscreteSample(rng, probs, n);
  const stats = computeDiscreteStats(sample, probs, n);

  const tbody = document.getElementById("discreteFreqBody");
  tbody.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const row = tbody.insertRow();
    row.insertCell().textContent = i + 1;
    row.insertCell().textContent = probs[i].toFixed(4);
    row.insertCell().textContent = stats.empProbs[i].toFixed(4);
    row.insertCell().textContent = stats.freq[i];
  }
  const summary = document.getElementById("discreteSummary");
  summary.innerHTML = `
      <strong>Выборочное среднее:</strong> ${stats.empMean.toFixed(4)} (теор: ${stats.theorMean.toFixed(4)}), погр. ${formatError(stats.empMean, stats.theorMean, stats.meanErrRel)}<br>
      <strong>Выборочная дисперсия:</strong> ${stats.empVar.toFixed(4)} (теор: ${stats.theorVar.toFixed(4)}), погр. ${formatError(stats.empVar, stats.theorVar, stats.varErrRel)}<br>
        <strong>Статистика χ²:</strong> ${stats.chi2.toFixed(4)} (крит. 9.488)<br>
        <strong>Гипотеза о распределении:</strong> ${stats.hypothesis}${!stats.valid ? " (некоторые ожидаемые частоты <5, результат может быть ненадёжен)" : ""}
    `;

  drawDiscreteChart(probs, stats.empProbs);
}

let discreteChartInstance = null;
function drawDiscreteChart(theorProbs, empProbs) {
  if (discreteChartInstance) discreteChartInstance.destroy();
  const ctx = document.getElementById("discreteChart").getContext("2d");
  discreteChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["1", "2", "3", "4", "5"],
      datasets: [
        {
          label: "Эмпирическая вероятность",
          data: empProbs,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
        {
          label: "Теоретическая вероятность",
          data: theorProbs,
          backgroundColor: "rgba(255, 99, 132, 0.5)",
          borderColor: "rgba(255, 99, 132, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { title: { display: true, text: "Вероятность" }, beginAtZero: true },
        x: { title: { display: true, text: "Значение" } },
      },
    },
  });
}

// Нормальная СВ (Бокса-Мюллера)
function boxMuller(rng) {
  let u1 = rng.next();
  let u2 = rng.next();
  while (u1 === 0) u1 = rng.next();
  while (u2 === 0) u2 = rng.next();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
  return [z0, z1];
}

function calculateRelativeError(actual, theoretical) {
  const EPS = 1e-12;
  if (Math.abs(theoretical) < EPS) return null;
  return (Math.abs(actual - theoretical) / Math.abs(theoretical)) * 100;
}

function formatError(actual, theoretical, relativeError) {
  if (relativeError === null) {
    const absErr = Math.abs(actual - theoretical);
    return `н/д (теор. значение = 0), абс. погр. ${absErr.toFixed(4)}`;
  }
  return `${relativeError.toFixed(2)}%`;
}

function generateNormalSample(rng, mu, sigma, n) {
  const sample = [];
  while (sample.length < n) {
    const [z0, z1] = boxMuller(rng);
    sample.push(mu + sigma * z0);
    if (sample.length < n) sample.push(mu + sigma * z1);
  }
  return sample.slice(0, n);
}

// Приближение функции распределения стандартного нормального (CDF)
function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

function computeNormalStats(sample, mu, sigma, n) {
  const empMean = sample.reduce((a, b) => a + b, 0) / n;
  const empVar = sample.reduce((s, v) => s + (v - empMean) ** 2, 0) / n;
  const meanErrRel = calculateRelativeError(empMean, mu);
  const varErrRel = calculateRelativeError(empVar, sigma * sigma);

  // Построение гистограммы: число интервалов по правилу Стёрджеса
  const k = Math.floor(1 + Math.log2(n));
  const minVal = Math.min(...sample);
  const maxVal = Math.max(...sample);
  const width = (maxVal - minVal) / k;
  const bins = [];
  for (let i = 0; i < k; i++) {
    bins.push({
      left: minVal + i * width,
      right: minVal + (i + 1) * width,
      count: 0,
    });
  }
  for (let v of sample) {
    let idx = Math.floor((v - minVal) / width);
    if (idx === k) idx--;
    bins[idx].count++;
  }

  // Теоретические вероятности для интервалов
  let chi2 = 0;
  for (let bin of bins) {
    const pLeft = normalCDF((bin.left - mu) / sigma);
    const pRight = normalCDF((bin.right - mu) / sigma);
    const p = pRight - pLeft;
    const expected = n * p;
    if (expected >= 5) {
      chi2 += (bin.count - expected) ** 2 / expected;
    }
  }
  const df = k - 3; // df = k-1 (интервалы) -2 (оценки параметров)
  const critical =
    { 10: 16.919, 100: 124.342, 1000: 1073.64, 10000: 10236.6 }[n] || 16.919; // приблизительно
  const hypothesis = chi2 <= critical ? "принимается" : "отвергается";
  return { bins, empMean, empVar, meanErrRel, varErrRel, chi2, hypothesis };
}

let histogramChart = null;

function drawHistogram(bins, mu, sigma, n) {
  const labels = bins.map((b) => `${b.left.toFixed(2)}-${b.right.toFixed(2)}`);
  const counts = bins.map((b) => b.count);
  if (histogramChart) histogramChart.destroy();
  const ctx = document.getElementById("histogram").getContext("2d");
  histogramChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Эмпирическая частота",
          data: counts,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { title: { display: true, text: "Частота" } },
        x: { title: { display: true, text: "Интервалы" } },
      },
    },
  });
}

function runNormal(n) {
  const seed = parseInt(document.getElementById("normalSeed").value) || 12345;
  const mu = parseFloat(document.getElementById("mu").value) || 0;
  const sigma2 = parseFloat(document.getElementById("sigma2").value) || 1;
  const sigma = Math.sqrt(sigma2);
  const rng = new CustomRNG(seed);
  const sample = generateNormalSample(rng, mu, sigma, n);
  const stats = computeNormalStats(sample, mu, sigma, n);
  drawHistogram(stats.bins, mu, sigma, n);
  const summaryDiv = document.getElementById("normalSummary");
  summaryDiv.innerHTML = `
      <strong>Выборочное среднее:</strong> ${stats.empMean.toFixed(4)} (теор: ${mu.toFixed(4)}), погр. ${formatError(stats.empMean, mu, stats.meanErrRel)}<br>
      <strong>Выборочная дисперсия:</strong> ${stats.empVar.toFixed(4)} (теор: ${sigma2.toFixed(4)}), погр. ${formatError(stats.empVar, sigma2, stats.varErrRel)}<br>
        <strong>Статистика χ²:</strong> ${stats.chi2.toFixed(4)} (крит. ≈ ${(n === 10 ? 16.919 : n === 100 ? 124.342 : n === 1000 ? 1073.64 : 10236.6).toFixed(2)})<br>
        <strong>Гипотеза о нормальности:</strong> ${stats.hypothesis}
    `;
}

// Переключение вкладок и обработчики
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document
      .querySelectorAll(".tab-content")
      .forEach((tab) => tab.classList.remove("active"));
    document.getElementById(btn.dataset.tab + "Tab").classList.add("active");
  });
});

document.querySelectorAll("#discreteTab .btn-primary").forEach((btn) => {
  btn.addEventListener("click", () => runDiscrete(parseInt(btn.dataset.n)));
});
document.querySelectorAll("#normalTab .btn-primary").forEach((btn) => {
  btn.addEventListener("click", () => runNormal(parseInt(btn.dataset.n)));
});

// Инициализация
updateProbSum();
