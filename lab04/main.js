// Реализованный базовый датчик – мультипликативный конгруэнтный генератор
class CustomRNG {
  constructor(seed) {
    this.mod = 2147483647; // 2^61 - 1 (простое число Мерсенна)
    this.mult = 16807; // множитель (проверенный)
    this.state = seed % this.mod;
    if (this.state === 0) this.state = 1;
  }

  next() {
    this.state = (this.mult * this.state) % this.mod;
    return this.state / this.mod; // число в [0,1)
  }
}

// Вычисление выборочного среднего и дисперсии
function computeStats(generator, n) {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const x = generator.next();
    sum += x;
    sumSq += x * x;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return { mean, variance };
}

function computeBuiltinStats(n) {
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const x = Math.random();
    sum += x;
    sumSq += x * x;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return { mean, variance };
}

document.getElementById("runBtn").addEventListener("click", () => {
  const sampleSize = parseInt(document.getElementById("sampleSize").value);
  const seed = parseInt(document.getElementById("seed").value);
  if (isNaN(sampleSize) || sampleSize <= 0) {
    alert("Введите корректный размер выборки");
    return;
  }
  if (isNaN(seed) || seed <= 0) {
    alert("Введите положительное зерно");
    return;
  }

  // Запуск обоих генераторов
  const customGen = new CustomRNG(seed);
  const customStats = computeStats(customGen, sampleSize);
  const builtinStats = computeBuiltinStats(sampleSize);

  // Обновление таблицы
  document.querySelector(".mean-custom").textContent =
    customStats.mean.toFixed(8);
  document.querySelector(".var-custom").textContent =
    customStats.variance.toFixed(8);
  document.querySelector(".mean-builtin").textContent =
    builtinStats.mean.toFixed(8);
  document.querySelector(".var-builtin").textContent =
    builtinStats.variance.toFixed(8);

  // Теоретические значения
  const theoreticalMean = 0.5;
  const theoreticalVar = 1 / 12; // ≈0.0833333333

  const customMeanErr = Math.abs(customStats.mean - theoreticalMean);
  const customVarErr = Math.abs(customStats.variance - theoreticalVar);
  const builtinMeanErr = Math.abs(builtinStats.mean - theoreticalMean);
  const builtinVarErr = Math.abs(builtinStats.variance - theoreticalVar);

  // Формирование вывода
  let conclusion = `<strong>Вывод:</strong><br>`;
  conclusion += `При размере выборки n = ${sampleSize.toLocaleString()} получены следующие результаты:<br>`;
  conclusion += `• Реализованный датчик (LCG): среднее = ${customStats.mean.toFixed(8)} (отклонение ${customMeanErr.toExponential(2)}), дисперсия = ${customStats.variance.toFixed(8)} (отклонение ${customVarErr.toExponential(2)}).<br>`;
  conclusion += `• Встроенный датчик (Math.random): среднее = ${builtinStats.mean.toFixed(8)} (отклонение ${builtinMeanErr.toExponential(2)}), дисперсия = ${builtinStats.variance.toFixed(8)} (отклонение ${builtinVarErr.toExponential(2)}).<br>`;
  conclusion += `Оба датчика дают результаты, близкие к теоретическим значениям (0.5 и 0.08333333). Реализованный мультипликативный конгруэнтный генератор обеспечивает достаточную равномерность и воспроизводимость (при фиксированном зерне). Небольшие отклонения обусловлены случайностью выборки конечного размера.`;
  document.getElementById("conclusion").innerHTML = conclusion;
});
