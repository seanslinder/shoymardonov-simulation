// Реализация мультипликативного конгруэнтного генератора (LCG)
class CustomRNG {
  constructor(seed) {
    this.mod = 2147483647; // 2^31 - 1
    this.mult = 16807; // множитель
    this.state = seed % this.mod;
    if (this.state === 0) this.state = 1;
  }

  next() {
    this.state = (this.mult * this.state) % this.mod;
    return this.state / this.mod; // число в [0,1)
  }
}

// Создаём экземпляр генератора с начальным зерном
let rng = new CustomRNG(12345);

// Функция для получения случайного числа от 0 до 1 с использованием собственного ГСЧ
function getRandom() {
  return rng.next();
}

// Функция для сброса генератора с новым зерном
function resetRNG(seed) {
  rng = new CustomRNG(seed);
}

// --- Часть 1: Скажи "да" или "нет" ---
const yesNoBtn = document.getElementById("yesNoBtn");
const yesNoResult = document.getElementById("yesNoResult");
const yesNoProbInput = document.getElementById("yesNoProbability");

function animateResult(element, newText) {
  if (!element) return;
  // Добавляем класс для анимации исчезновения
  element.style.transition = "opacity 0.15s ease, transform 0.2s ease";
  element.style.opacity = "0";
  element.style.transform = "scale(0.9)";

  setTimeout(() => {
    element.textContent = newText;
    element.style.opacity = "1";
    element.style.transform = "scale(1)";
  }, 150);
}

if (yesNoBtn && yesNoResult) {
  let lastAnswer = null;
  yesNoBtn.addEventListener("click", () => {
    const random = getRandom();
    const yesProbability = parseFloat(yesNoProbInput.value) || 0.5;
    const answer = random < yesProbability ? "Да" : "Нет";

    // Если ответ не изменился, всё равно показываем анимацию
    if (answer === lastAnswer) {
      animateResult(yesNoResult, answer);
    } else {
      animateResult(yesNoResult, answer);
    }
    lastAnswer = answer;
  });
}

// --- Часть 2: Шар предсказаний ---
const askBtn = document.getElementById("askBtn");
const questionInput = document.getElementById("question");
const magicResultDiv = document.getElementById("magicResult");
const ballPlaceholder = document.querySelector(
  "#magicResult .ball-placeholder",
);
const answerTextElem = document.querySelector("#magicResult .answer-text");

// Список ответов (положительные, нейтральные, отрицательные)
const answers = [
  { text: "Бесспорно", type: "positive" },
  { text: "Предрешено", type: "positive" },
  { text: "Никаких сомнений", type: "positive" },
  { text: "Определённо да", type: "positive" },
  { text: "Можешь быть уверен в этом", type: "positive" },
  { text: "Вероятнее всего", type: "positive" },
  { text: "Хорошие перспективы", type: "positive" },
  { text: "Знаки говорят — да", type: "positive" },
  { text: "Да", type: "positive" },
  { text: "Пока не ясно, попробуй снова", type: "neutral" },
  { text: "Спроси позже", type: "neutral" },
  { text: "Лучше не рассказывать", type: "neutral" },
  { text: "Сейчас нельзя предсказать", type: "neutral" },
  { text: "Сконцентрируйся и спроси опять", type: "neutral" },
  { text: "Не рассчитывай на это", type: "negative" },
  { text: "Мой ответ — нет", type: "negative" },
  { text: "Весьма сомнительно", type: "negative" },
  { text: "Перспективы не очень хорошие", type: "negative" },
];

function getRandomAnswer() {
  const random = getRandom();

  // Получаем вероятности из инпутов
  let posProb =
    parseFloat(document.getElementById("answerPositiveProbability").value) ||
    0.44;
  let neuProb =
    parseFloat(document.getElementById("answerNeutralProbability").value) ||
    0.28;
  let negProb =
    parseFloat(document.getElementById("answerNegativeProbability").value) ||
    0.28;

  // Нормализуем вероятности, чтобы их сумма была 1
  const totalProb = posProb + neuProb + negProb;
  posProb = posProb / totalProb;
  neuProb = neuProb / totalProb;
  negProb = negProb / totalProb;

  // Выбираем тип ответа на основе вероятностей
  let answerType;
  if (random < posProb) {
    answerType = "positive";
  } else if (random < posProb + neuProb) {
    answerType = "neutral";
  } else {
    answerType = "negative";
  }

  // Получаем все ответы выбранного типа
  const filteredAnswers = answers.filter((a) => a.type === answerType);

  // Выбираем случайный ответ из найденных
  const idx = Math.floor(getRandom() * filteredAnswers.length);
  return filteredAnswers[idx];
}

function animateMagic8Ball(answer) {
  if (!ballPlaceholder || !answerTextElem) return;

  // 1. Встряска шара
  ballPlaceholder.style.transition = "transform 0.1s ease";
  ballPlaceholder.style.transform = "rotate(15deg) scale(1.1)";

  setTimeout(() => {
    ballPlaceholder.style.transform = "rotate(-15deg) scale(1.1)";
  }, 80);

  setTimeout(() => {
    ballPlaceholder.style.transform = "rotate(0deg) scale(1)";
  }, 160);

  // 2. Исчезновение старого ответа
  answerTextElem.style.transition = "opacity 0.2s ease, transform 0.2s ease";
  answerTextElem.style.opacity = "0";
  answerTextElem.style.transform = "translateY(10px)";

  // 3. Появление нового ответа
  setTimeout(() => {
    answerTextElem.textContent = answer.text;

    if (answer.type === "positive") {
      answerTextElem.style.color = "#28a745";
    } else if (answer.type === "negative") {
      answerTextElem.style.color = "#dc3545";
    } else {
      answerTextElem.style.color = "#fd7e14";
    }

    answerTextElem.style.opacity = "1";
    answerTextElem.style.transform = "translateY(0)";
  }, 200);

  // 4. Дополнительный эффект свечения для шара
  if (magicResultDiv) {
    magicResultDiv.style.transition = "box-shadow 0.2s ease";
    magicResultDiv.style.boxShadow = "0 0 20px rgba(0,123,255,0.5)";
    setTimeout(() => {
      magicResultDiv.style.boxShadow = "";
    }, 400);
  }
}

if (askBtn && questionInput && answerTextElem) {
  let lastAnswerText = null;

  askBtn.addEventListener("click", () => {
    const question = questionInput.value.trim();
    if (question === "") {
      alert("Пожалуйста, задайте вопрос.");
      return;
    }
    if (!question.endsWith("?")) {
      if (
        !confirm(
          "Ваш вопрос не заканчивается вопросительным знаком. Продолжить?",
        )
      ) {
        return;
      }
    }
    const answer = getRandomAnswer();

    // Даже если ответ совпал с предыдущим, анимация всё равно покажет изменение
    animateMagic8Ball(answer);
    lastAnswerText = answer.text;
  });

  questionInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      askBtn.click();
    }
  });
}

// --- Управление зерном ---
const seedInput = document.getElementById("seed");
const resetSeedBtn = document.getElementById("resetSeedBtn");

if (resetSeedBtn && seedInput) {
  resetSeedBtn.addEventListener("click", () => {
    let newSeed = parseInt(seedInput.value);
    if (isNaN(newSeed) || newSeed <= 0) {
      newSeed = 12345;
      seedInput.value = 12345;
    }
    resetRNG(newSeed);

    // Анимация сброса
    const resetBtn = resetSeedBtn;
    resetBtn.style.transform = "scale(0.95)";
    setTimeout(() => {
      resetBtn.style.transform = "";
    }, 150);

    // Очищаем предыдущие результаты с анимацией
    if (yesNoResult) {
      animateResult(yesNoResult, "—");
    }
    if (answerTextElem) {
      answerTextElem.style.transition = "opacity 0.2s ease";
      answerTextElem.style.opacity = "0";
      setTimeout(() => {
        answerTextElem.textContent = "ГСЧ сброшен";
        answerTextElem.style.color = "#333";
        answerTextElem.style.opacity = "1";
        setTimeout(() => {
          answerTextElem.textContent = 'Нажмите "Спросить"';
        }, 1500);
      }, 150);
    }
  });
}

// Инициализация: начальный текст
if (answerTextElem) {
  answerTextElem.textContent = 'Нажмите "Спросить"';
}

// Добавляем CSS-анимации для более плавного отображения
const style = document.createElement("style");
style.textContent = `
    .result {
        transition: box-shadow 0.3s ease;
    }
    #yesNoResult {
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    .ball-placeholder {
        transition: transform 0.1s ease;
        display: inline-block;
    }
    .answer-text {
        transition: opacity 0.2s ease, transform 0.2s ease;
        display: inline-block;
    }
`;
document.head.appendChild(style);
