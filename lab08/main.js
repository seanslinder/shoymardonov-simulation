let chartInstance = null;

document.getElementById("btnSimulate").addEventListener("click", runSimulation);
document.getElementById("btnReset").addEventListener("click", resetUI);

function runSimulation() {
  const lambda = parseFloat(document.getElementById("lambda").value);
  const intervalT = parseFloat(document.getElementById("intervalT").value);
  const simDuration = parseFloat(document.getElementById("simDuration").value);

  if (![lambda, intervalT, simDuration].every((v) => Number.isFinite(v) && v > 0)) {
    alert("Введите корректные значения: λ, T и длительность должны быть больше 0.");
    return;
  }

  const counts = simulatePoisson(lambda, simDuration, intervalT);
  const intervals = counts.length;
  const totalRequests = counts.reduce((sum, c) => sum + c, 0);
  const mean = totalRequests / intervals;
  const variance =
    counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / intervals;

  updateSummary({
    intervals,
    lastIntervalCount: counts[counts.length - 1],
    mean,
    variance,
    theoryValue: lambda * intervalT,
  });

  updateIntervalTable(counts, intervalT, simDuration);
  drawDistributionChart(counts);
  updateConclusion(mean, variance, lambda * intervalT);
}

function simulatePoisson(lambda, totalTime, intervalLength) {
  const intervals = Math.max(1, Math.ceil(totalTime / intervalLength));
  const counts = new Array(intervals).fill(0);
  let currentTime = 0;

  while (true) {
    const u = 1 - Math.random();
    const interArrival = -Math.log(u) / lambda;
    currentTime += interArrival;
    if (currentTime > totalTime) break;

    let index = Math.floor(currentTime / intervalLength);
    if (index >= intervals) index = intervals - 1;
    counts[index] += 1;
  }

  return counts;
}

function updateSummary({ intervals, lastIntervalCount, mean, variance, theoryValue }) {
  document.getElementById("intervalsCount").textContent = intervals;
  document.getElementById("lastIntervalCount").textContent = lastIntervalCount;
  document.getElementById("meanValue").textContent = mean.toFixed(4);
  document.getElementById("varianceValue").textContent = variance.toFixed(4);
  document.getElementById("theoryValue").textContent = theoryValue.toFixed(4);
}

function updateIntervalTable(counts, intervalT, simDuration) {
  const tbody = document.getElementById("intervalBody");
  tbody.innerHTML = "";

  counts.forEach((count, index) => {
    const start = (index * intervalT).toFixed(2);
    const end = Math.min((index + 1) * intervalT, simDuration).toFixed(2);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${start} - ${end}</td>
      <td>${count}</td>
    `;
    tbody.appendChild(tr);
  });
}

function drawDistributionChart(counts) {
  const maxCount = Math.max(...counts, 0);
  const frequency = new Array(maxCount + 1).fill(0);
  counts.forEach((c) => {
    frequency[c] += 1;
  });

  const labels = frequency.map((_, i) => i);
  const ctx = document.getElementById("distributionChart").getContext("2d");
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Частота",
          data: frequency,
          backgroundColor: "rgba(54, 162, 235, 0.6)",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Число интервалов" },
        },
        x: {
          title: { display: true, text: "Число заявок в интервале T" },
        },
      },
    },
  });
}

function updateConclusion(mean, variance, theoryValue) {
  const meanDiff = Math.abs(mean - theoryValue);
  const varDiff = Math.abs(variance - theoryValue);
  const relMean = theoryValue > 0 ? meanDiff / theoryValue : 0;
  const relVar = theoryValue > 0 ? varDiff / theoryValue : 0;
  const tolerance = 0.15;

  const conclusion = document.getElementById("conclusion");
  if (relMean <= tolerance && relVar <= tolerance) {
    conclusion.textContent =
      `Среднее и дисперсия близки к теоретическому значению μ = λT = ${theoryValue.toFixed(3)}.` +
      " Результаты согласуются с пуассоновским характером потока.";
  } else {
    conclusion.textContent =
      `Наблюдаются отклонения от теоретического μ = λT = ${theoryValue.toFixed(3)}.` +
      " Увеличьте длительность моделирования, чтобы оценки стабилизировались.";
  }
}

function resetUI() {
  document.getElementById("intervalsCount").textContent = "-";
  document.getElementById("lastIntervalCount").textContent = "-";
  document.getElementById("meanValue").textContent = "-";
  document.getElementById("varianceValue").textContent = "-";
  document.getElementById("theoryValue").textContent = "-";
  document.getElementById("intervalBody").innerHTML = "";
  document.getElementById("conclusion").textContent =
    "Запустите симуляцию, чтобы получить результаты.";

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

resetUI();
