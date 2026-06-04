// Обертка для графиков
let outcomeChart = null;

document.getElementById('btnSimulate').addEventListener('click', runSimulation);
document.getElementById('btnReset').addEventListener('click', resetSimulation);

function expRandom(rate) {
    if (rate <= 0) return Infinity;
    return -Math.log(1 - Math.random()) / rate;
}

class Request {
    constructor(id, arrivalTime, maxWaitTime) {
        this.id = id;
        this.arrivalTime = arrivalTime;
        this.maxWaitTime = maxWaitTime;
        this.abandonTime = arrivalTime + maxWaitTime;
        
        this.status = 'NEW'; // NEW, IN_QUEUE, SERVING, SERVED, REJECTED, ABANDONED
        this.serviceStartTime = null;
        this.finishTime = null;
    }
}

class Server {
    constructor(id) {
        this.id = id;
        this.isBusy = false;
        this.currentRequest = null;
    }
    
    startService(req, time, mu) {
        this.isBusy = true;
        this.currentRequest = req;
        req.status = 'SERVING';
        req.serviceStartTime = time;
        const duration = expRandom(mu);
        return time + duration;
    }
    
    finishService(time) {
        if (!this.currentRequest) return null;
        this.currentRequest.status = 'SERVED';
        this.currentRequest.finishTime = time;
        const req = this.currentRequest;
        this.isBusy = false;
        this.currentRequest = null;
        return req;
    }
}

class EventQueue {
    constructor() {
        this.events = [];
    }
    push(type, time, req, server = null) {
        this.events.push({ type, time, req, server });
        // Упорядочиваем по времени (Priority Queue)
        this.events.sort((a, b) => a.time - b.time);
    }
    pop() {
        return this.events.shift();
    }
    isEmpty() {
        return this.events.length === 0;
    }
}


function runSimulation() {
    const lambda = parseFloat(document.getElementById('lambda').value);
    const mu = parseFloat(document.getElementById('mu').value);
    const c = parseInt(document.getElementById('channels').value);
    const K = parseInt(document.getElementById('queueCap').value);
    const gamma = parseFloat(document.getElementById('gamma').value);
    const T = parseFloat(document.getElementById('simDuration').value);

    if (lambda <= 0 || mu <= 0 || c <= 0 || K < 0 || gamma < 0 || T <= 0) {
        alert("Пожалуйста, введите корректные (положительные) значения.");
        return;
    }

    const eq = new EventQueue();
    const servers = Array.from({ length: c }, (_, i) => new Server(i + 1));
    const queue = [];
    const allRequests = [];
    const eventLog = []; // логируем для GUI

    let time = 0;
    let reqCounter = 0;

    // Сгенерируем все события прибытия сразу
    let arrivalTime = expRandom(lambda);
    while (arrivalTime <= T) {
        reqCounter++;
        const maxWait = expRandom(gamma);
        const req = new Request(reqCounter, arrivalTime, maxWait);
        allRequests.push(req);
        eq.push('ARRIVAL', arrivalTime, req);
        
        arrivalTime += expRandom(lambda);
    }

    let servedCount = 0;
    let rejectedCount = 0;
    let abandonedCount = 0;

    // Главный цикл обработки событий
    while (!eq.isEmpty()) {
        const ev = eq.pop();
        if (ev.time > T) break;

        time = ev.time;

        const countBusy = servers.filter(s => s.isBusy).length;
        const qLen = queue.length;
        const stateStr = `${countBusy}/${c} | Оч: ${qLen}/${K}`;

        if (ev.type === 'ARRIVAL') {
            const req = ev.req;
            // Ищем свободный сервер
            const freeServer = servers.find(s => !s.isBusy);

            if (freeServer) {
                // Обслуживаем сразу
                const depTime = freeServer.startService(req, time, mu);
                eq.push('DEPARTURE', depTime, req, freeServer);
                logEvent(time, 'Прибытие', req, stateStr + ` -> Начат приб.${freeServer.id}`);
            } else {
                // Серверов нет, встает в очередь (если есть место)
                if (queue.length < K) {
                    req.status = 'IN_QUEUE';
                    queue.push(req);
                    logEvent(time, 'В очередь', req, stateStr);
                    // Генерируем событие ухода из-за нетерпения
                    if (req.abandonTime < Infinity) {
                        eq.push('ABANDON', req.abandonTime, req);
                    }
                } else {
                    // Отказ из-за отсутствия мест
                    req.status = 'REJECTED';
                    rejectedCount++;
                    logEvent(time, 'ОТКАЗ (Мест нет)', req, stateStr);
                }
            }
        } 
        else if (ev.type === 'DEPARTURE') {
            const server = ev.server;
            server.finishService(time);
            servedCount++;
            
            logEvent(time, 'Обслужена', ev.req, stateStr + ` -> Освобожден приб.${server.id}`);

            // Проверяем очередь
            if (queue.length > 0) {
                // Вынимаем первого дождавшегося клиента
                const nextReq = queue.shift();
                const depTime = server.startService(nextReq, time, mu);
                eq.push('DEPARTURE', depTime, nextReq, server);
                logEvent(time, 'Из очереди на обслуж.', nextReq, `Приб.${server.id}`);
            }
        }
        else if (ev.type === 'ABANDON') {
            const req = ev.req;
            // Если заявка все еще в очереди, она уходит
            if (req.status === 'IN_QUEUE') {
                const index = queue.indexOf(req);
                if (index !== -1) {
                    queue.splice(index, 1);
                    req.status = 'ABANDONED';
                    abandonedCount++;
                    logEvent(time, 'УШЕЛ (Не дождался)', req, `Оч: ${queue.length}/${K}`);
                }
            }
        }
    }

    function logEvent(t, type, req, statusInfo) {
        if (eventLog.length < 30) {
            eventLog.push({ t, type, reqId: req.id, statusInfo });
        }
    }

    // Вычисляем финальную статистику
    const totalAssigned = allRequests.length;
    // Корректировка, если время вышло, а заявки еще обслуживаются/в очереди (оставляем как есть, для простоты не считаются)
    
    // Эмпирическая относительная ПС
    const Q = totalAssigned > 0 ? (servedCount / totalAssigned) : 0;
    
    // Среднее время в очереди (только для тех, кто завершил ожидание - неважно, обслужен или ушел)
    let totalWaitTime = 0;
    let waitCount = 0;
    for (let r of allRequests) {
        if (r.status === 'SERVED') {
            totalWaitTime += (r.serviceStartTime - r.arrivalTime);
            waitCount++;
        } else if (r.status === 'ABANDONED') {
            totalWaitTime += (r.maxWaitTime);
            waitCount++;
        }
    }
    const Wq = waitCount > 0 ? (totalWaitTime / waitCount) : 0;

    // Обновляем UI
    document.getElementById('resTotal').textContent = totalAssigned;
    document.getElementById('resServed').textContent = servedCount;
    document.getElementById('resRejected').textContent = rejectedCount;
    document.getElementById('resAbandoned').textContent = abandonedCount;
    document.getElementById('resQ').textContent = Q.toFixed(4);
    document.getElementById('resWq').textContent = Wq.toFixed(4);

    // Таблица
    const evBody = document.getElementById('eventBody');
    evBody.innerHTML = '';
    eventLog.forEach(ev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ev.t.toFixed(4)}</td>
            <td>${ev.type}</td>
            <td>№${ev.reqId}</td>
            <td>${ev.statusInfo}</td>
        `;
        evBody.appendChild(tr);
    });
    if (totalAssigned > 30) {
        evBody.insertAdjacentHTML('beforeend', '<tr><td colspan="4" style="text-align: center;">... (остальные скрыты) ...</td></tr>');
    }

    // Отрисовка pie chart
    renderChart(servedCount, rejectedCount, abandonedCount, totalAssigned - servedCount - rejectedCount - abandonedCount);

    // Вывод аналитики
    document.getElementById('conclusion').innerHTML = `
        Моделирование M/M/${c}/${K} успешно завершено. <br/>
        При данных параметрах успешно обслужено <strong>${((servedCount/Math.max(1,totalAssigned))*100).toFixed(1)}%</strong> заявок.<br/>
        Доля ушедших от нетерпеливости: <strong>${((abandonedCount/Math.max(1,totalAssigned))*100).toFixed(1)}%</strong>.
    `;
}

function renderChart(served, rejected, abandoned, remaining) {
    const ctx = document.getElementById('outcomeChart').getContext('2d');
    if (outcomeChart) outcomeChart.destroy();

    outcomeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Обслужены', 'Отклонены (мест нет)', 'Ушли (не дождались)', 'Зависли (в конце)'],
            datasets: [{
                data: [served, rejected, abandoned, Math.max(0, remaining)],
                backgroundColor: [
                    '#28a745', // Green
                    '#dc3545', // Red
                    '#ffc107', // Yellow
                    '#6c757d'  // Gray
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function resetSimulation() {
    ['resTotal', 'resServed', 'resRejected', 'resAbandoned', 'resQ', 'resWq'].forEach(id => {
        document.getElementById(id).textContent = '-';
    });
    document.getElementById('eventBody').innerHTML = '';
    document.getElementById('conclusion').innerHTML = 'Запустите симуляцию, чтобы получить результаты.';

    if (outcomeChart) {
        outcomeChart.destroy();
        outcomeChart = null;
    }
}

// Автозапуск
runSimulation();
