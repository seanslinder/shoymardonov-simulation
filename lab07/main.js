let chartInstance = null;
let animationId = null;
let simulationData = [];

const stateNames = ["Ясно", "Облачно", "Пасмурно"];
const stateClasses = ["clear-weather", "cloudy-weather", "overcast-weather"];

document.getElementById('btnSimulate').addEventListener('click', () => runSimulation(false));
document.getElementById('btnRealtime').addEventListener('click', () => runSimulation(true));
document.getElementById('btnReset').addEventListener('click', resetSimulation);
document.getElementById('btnSaveCSV').addEventListener('click', saveCSV);

function resetSimulation() {
    if (animationId) {
        clearTimeout(animationId);
        animationId = null;
    }
    document.getElementById('btnRealtime').disabled = false;
    
    // Получаем текущее выбранное стартовое состояние, чтобы сбросить к нему
    const startState = parseInt(document.getElementById('startState').value);
    
    // Сброс интерфейса
    updateUI(startState, 0); 
    
    // Сброс таблицы статистики
    const tbody = document.getElementById('statsBody');
    tbody.innerHTML = '';
    
    // Очистка графика
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    simulationData = [];
}

function getMatrix() {
    const q12 = parseFloat(document.getElementById('q12').value);
    const q13 = parseFloat(document.getElementById('q13').value);
    const q21 = parseFloat(document.getElementById('q21').value);
    const q23 = parseFloat(document.getElementById('q23').value);
    const q31 = parseFloat(document.getElementById('q31').value);
    const q32 = parseFloat(document.getElementById('q32').value);

    const l1 = q12 + q13;
    const l2 = q21 + q23;
    const l3 = q31 + q32;

    return [
        [-l1, q12, q13],
        [q21, -l2, q23],
        [q31, q32, -l3]
    ];
}

function solveTheoretical(Q) {
    let M = [
        [Q[0][0], Q[1][0], Q[2][0]],
        [Q[0][1], Q[1][1], Q[2][1]],
        [1, 1, 1]
    ];
    
    function det(m) {
        return m[0][0]*m[1][1]*m[2][2] + m[0][1]*m[1][2]*m[2][0] + m[0][2]*m[1][0]*m[2][1]
             - m[0][2]*m[1][1]*m[2][0] - m[0][1]*m[1][0]*m[2][2] - m[0][0]*m[1][2]*m[2][1];
    }
    
    let D = det(M);
    
    let Mx = [ [0, M[0][1], M[0][2]], [0, M[1][1], M[1][2]], [1, M[2][1], M[2][2]] ];
    let My = [ [M[0][0], 0, M[0][2]], [M[1][0], 0, M[1][2]], [M[2][0], 1, M[2][2]] ];
    let Mz = [ [M[0][0], M[0][1], 0], [M[1][0], M[1][1], 0], [M[2][0], M[2][1], 1] ];
    
    return [det(Mx)/D, det(My)/D, det(Mz)/D];
}

function getNextState(Q, currentState) {
    const lambda = -Q[currentState][currentState];
    const probs = Q[currentState].map(q => q >= 0 ? q / lambda : 0);
    
    const r = Math.random();
    let sum = 0;
    for (let i = 0; i < probs.length; i++) {
        if (i === currentState) continue;
        sum += probs[i];
        if (r <= sum) return i;
    }
    return currentState;
}

function updateUI(currentState, currentTime) {
    const box = document.getElementById('weatherStatus');
    box.textContent = stateNames[currentState];
    box.className = 'weather-box ' + stateClasses[currentState];
    
    const days = Math.floor(currentTime);
    const hours = Math.floor((currentTime % 1) * 24);
    document.getElementById('currentDay').textContent = `${days} дней, ${hours} ч.`;
}

function drawChart(theo, emp) {
    const ctx = document.getElementById('weatherChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stateNames,
            datasets: [
                {
                    label: 'Эмпирические',
                    data: emp,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                },
                {
                    label: 'Теоретические',
                    data: theo,
                    backgroundColor: 'rgba(255, 99, 132, 0.6)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 1 } }
        }
    });
}

function runSimulation(isAnimation) {
    if (animationId) clearTimeout(animationId);
    
    const Q = getMatrix();
    const theorProbs = solveTheoretical(Q);
    const maxTime = parseFloat(document.getElementById('simTime').value);
    let currentState = parseInt(document.getElementById('startState').value);
    
    let currentTime = 0;
    let timeInState = [0, 0, 0];
    simulationData = []; // for CSV
    
    if (!isAnimation) {
        while (currentTime < maxTime) {
            const lambda = -Q[currentState][currentState];
            const tau = -Math.log(Math.random()) / lambda;
            const stepTime = Math.min(tau, maxTime - currentTime);
            
            timeInState[currentState] += stepTime;
            currentTime += stepTime;
            simulationData.push({ dayEnd: currentTime.toFixed(2), state: stateNames[currentState], duration: stepTime.toFixed(2) });
            
            if (currentTime < maxTime) {
                currentState = getNextState(Q, currentState);
            }
        }
        finishSimulation(timeInState, maxTime, theorProbs, currentState);
    } else {
        document.getElementById('btnRealtime').disabled = true;
        
        function step() {
            const lambda = -Q[currentState][currentState];
            const tau = -Math.log(Math.random()) / lambda;
            const stepTime = Math.min(tau, maxTime - currentTime);
            
            updateUI(currentState, currentTime);
            
            animationId = setTimeout(() => {
                timeInState[currentState] += stepTime;
                currentTime += stepTime;
                
                simulationData.push({ dayEnd: currentTime.toFixed(2), state: stateNames[currentState], duration: stepTime.toFixed(2) });
                updateStats(timeInState, currentTime, theorProbs);
                
                if (currentTime >= maxTime) {
                    document.getElementById('btnRealtime').disabled = false;
                    finishSimulation(timeInState, maxTime, theorProbs, currentState);
                } else {
                    currentState = getNextState(Q, currentState);
                    step();
                }
            }, stepTime * 1000); // 1 day = 1 second
        }
        step();
    }
}

function finishSimulation(timeInState, maxTime, theor, finalState) {
    updateUI(finalState, maxTime);
    updateStats(timeInState, maxTime, theor);
    
    const emp = timeInState.map(t => t / maxTime);
    drawChart(theor, emp);
}

function updateStats(timeInState, currentTime, theor) {
    const tbody = document.getElementById('statsBody');
    tbody.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const emp = currentTime > 0 ? timeInState[i] / currentTime : 0;
        const err = Math.abs(emp - theor[i]);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${stateNames[i]}</td>
            <td>${timeInState[i].toFixed(2)}</td>
            <td>${emp.toFixed(4)}</td>
            <td>${theor[i].toFixed(4)}</td>
            <td>${err.toFixed(4)}</td>
        `;
        tbody.appendChild(tr);
    }
}

function saveCSV() {
    if (simulationData.length === 0) {
        alert("Сначала запустите симуляцию!");
        return;
    }
    
    let csv = "Time (days),State,Duration in State\n";
    simulationData.forEach(row => {
        csv += `${row.dayEnd},${row.state},${row.duration}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'weather_simulation.csv';
    link.click();
}
