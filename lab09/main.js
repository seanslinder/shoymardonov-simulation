let probChart = null;

document.getElementById('btnSimulate').addEventListener('click', runSimulation);
document.getElementById('btnReset').addEventListener('click', resetSimulation);

function expRandom(rate) {
    return -Math.log(1 - Math.random()) / rate;
}

function runSimulation() {
    const lambda = parseFloat(document.getElementById('lambda').value);
    let mu_orig = parseFloat(document.getElementById('mu').value);
    let mu = mu_orig;
    const T = parseFloat(document.getElementById('simDuration').value);

    if (lambda <= 0 || mu <= 0 || T <= 0) {
        alert("Параметры должны быть больше нуля.");
        return;
    }

    let time = 0;
    
    // 0 = простой, 1 = в работе
    let state = 0;
    
    let timeInState = [0, 0];
    let lastTime = 0;

    let arrivals = 0;
    let served = 0;
    let rejected = 0;

    let nextArrival = expRandom(lambda);
    let nextDeparture = Infinity;

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
                state = 1;
                served++;
                
                if (Math.random() < 0.10) {
                    mu = mu_orig * 2;
                } else {
                    mu = mu_orig;
                }
                
                nextDeparture = time + expRandom(mu);
            } else {
                rejected++;
            }
            nextArrival = time + expRandom(lambda);
        } else {
            state = 0;
            nextDeparture = Infinity;
        }
    }

    // Эмпирические данные
    const empP0 = timeInState[0] / T;
    const empP1 = timeInState[1] / T;
    const empRejectionRate = rejected / arrivals;

    document.getElementById('empIdle').textContent = empP0.toFixed(4);
    document.getElementById('empRejection').textContent = empRejectionRate.toFixed(4);
    document.getElementById('empBusy').textContent = empP1.toFixed(4);
}

function resetSimulation() {
    document.getElementById('lambda').value = 3;
    document.getElementById('mu').value = 4;
    document.getElementById('simDuration').value = 100;

    ['empIdle', 'empRejection', 'empBusy'].forEach(id => {
        document.getElementById(id).textContent = '-';
    });
}

