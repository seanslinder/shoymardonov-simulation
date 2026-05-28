let probChart = null;

document.getElementById('btnSimulate').addEventListener('click', runSimulation);
document.getElementById('btnReset').addEventListener('click', resetSimulation);

function expRandom(rate) {
    return -Math.log(1 - Math.random()) / rate;
}

function runSimulation() {
    const lambda = parseFloat(document.getElementById('lambda').value);
    const mu = parseFloat(document.getElementById('mu').value);
    const T = parseFloat(document.getElementById('simDuration').value);

    if (lambda <= 0 || mu <= 0 || T <= 0) {
        alert("Параметры должны быть больше нуля.");
        return;
    }

    // Теоретические показатели
    const t_p0 = mu / (lambda + mu); // вероятность простоя
    const t_p1 = lambda / (lambda + mu); // вероятность отказа
    const t_Q = t_p0;
    const t_A = lambda * t_Q;

    document.getElementById('theoryP0').textContent = t_p0.toFixed(4);
    document.getElementById('theoryP1').textContent = t_p1.toFixed(4);
    document.getElementById('theoryQ').textContent = t_Q.toFixed(4);
    document.getElementById('theoryA').textContent = t_A.toFixed(4);

    // Инициализация симуляции
    let time = 0;
    
    // 0 = idle, 1 = working
    let state = 0;
    
    // Времена нахождения в состояниях
    let timeInState = [0, 0];
    let lastTime = 0;

    let arrivals = 0;
    let served = 0;
    let rejected = 0;

    let nextArrival = expRandom(lambda);
    let nextDeparture = Infinity;

    const eventsLog = [];

    // Главный цикл событий
    while (time <= T) {
        const nextEventTime = Math.min(nextArrival, nextDeparture);
        
        if (nextEventTime > T) {
            // Завершение симуляции
            timeInState[state] += (T - lastTime);
            break;
        }

        // Учет времени в состоянии
        timeInState[state] += (nextEventTime - lastTime);
        lastTime = nextEventTime;
        time = nextEventTime;

        if (nextArrival < nextDeparture) {
            // Пришла заявка
            arrivals++;
            if (state === 0) {
                // Сервер свободен
                state = 1;
                served++;
                nextDeparture = time + expRandom(mu);
                if (eventsLog.length < 20) {
                    eventsLog.push({ t: time, type: 'Прибытие (обслуживается)', s: state });
                }
            } else {
                // Сервер занят -> отказ
                rejected++;
                if (eventsLog.length < 20) {
                    eventsLog.push({ t: time, type: 'Прибытие (ОТКАЗ)', s: state });
                }
            }
            // Планируем следующую заявку
            nextArrival = time + expRandom(lambda);
        } else {
            // Обслуживание завершено
            state = 0;
            nextDeparture = Infinity;
            if (eventsLog.length < 20) {
                eventsLog.push({ t: time, type: 'Окончание обслуживания', s: state });
            }
        }
    }

    // Эмпирические данные
    const empP0 = timeInState[0] / T;
    const empP1 = timeInState[1] / T;
    const empRejectionRate = rejected / arrivals;
    const empA = served / T;

    document.getElementById('totalArrivals').textContent = arrivals;
    document.getElementById('totalServed').textContent = served;
    document.getElementById('totalRejected').textContent = rejected;

    document.getElementById('empRejection').textContent = empRejectionRate.toFixed(4);
    document.getElementById('empA').textContent = empA.toFixed(4);

    // Заполнение таблицы событий
    const eventBody = document.getElementById('eventBody');
    eventBody.innerHTML = '';
    eventsLog.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ev.t.toFixed(4)}</td>
            <td>${ev.type}</td>
            <td>${ev.s}</td>
        `;
        eventBody.appendChild(tr);
    });
    if (eventsLog.length === 20) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="3" style="text-align: center;">... (показаны первые 20) ...</td>`;
        eventBody.appendChild(tr);
    }

    // Вывод графика
    updateChart(t_p0, t_p1, empP0, empP1);

    // Формирование вывода
    const conclusion = document.getElementById('conclusion');
    const errRej = Math.abs(empRejectionRate - t_p1) / t_p1 * 100;
    
    conclusion.innerHTML = `
        Симуляция успешно завершена.<br/>
        Эмпирическая вероятность отказа составила <strong>${empRejectionRate.toFixed(4)}</strong>, 
        что отличается от теоретического значения (${t_p1.toFixed(4)}) на <strong>${errRej.toFixed(2)}%</strong>.<br/>
    `;
}

function updateChart(t0, t1, e0, e1) {
    const ctx = document.getElementById('probChart').getContext('2d');
    
    if (probChart) {
        probChart.destroy();
    }

    probChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['P0 (Свободен)', 'P1 (Занят / Отказ)'],
            datasets: [
                {
                    label: 'Теоретическая вероятность',
                    data: [t0, t1],
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Эмпирическая вероятность',
                    data: [e0, e1],
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1
                }
            }
        }
    });
}

function resetSimulation() {
    document.getElementById('lambda').value = 3;
    document.getElementById('mu').value = 4;
    document.getElementById('simDuration').value = 100;

    ['theoryP0', 'theoryP1', 'theoryQ', 'theoryA', 
     'totalArrivals', 'totalServed', 'totalRejected', 
     'empRejection', 'empA'].forEach(id => {
        document.getElementById(id).textContent = '-';
    });

    document.getElementById('eventBody').innerHTML = '';
    document.getElementById('conclusion').innerHTML = 'Запустите симуляцию, чтобы получить результаты.';

    if (probChart) {
        probChart.destroy();
        probChart = null;
    }
}

// Запустим 1 раз при старте
// runSimulation(); 
