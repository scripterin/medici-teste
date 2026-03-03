const questionsData = [
    { q: "Te afli alături de un coleg într-un echipaj și ai preluat ultimul apel. Cum anunți pe stație?", a: ["M-X +1 10-1 (Call Sign -X)", "M-X 10-1", "M-X +1 10-13", "M-X 10-11"], correct: 0 },
    { q: "Ești cu un coleg spre un apel, ați avut un accident și nu mai puteți continua. Soliciti un echipaj adițional. Cum anunți?", a: ["M-callsign +1, am avut un 10-50 (major/minor), solicit un 10-78, la următorul 10-20.", "M-callsign 10-50, solicit un 10-76.", "M-callsign +1, accident rutier la 10-20.", "M-callsign, avem un 10-13 și solicităm ajutor."], correct: 0 },
    { q: "Te afli în zona Grove, iar două persoane mascate trag focuri de armă în direcția ta. Cum anunți?", a: ["M-callsign 10-0, la 10-20 Grove", "M-callsign 10-13 Grove", "M-callsign Cod 0 Grove", "M-callsign 10-78 la Grove"], correct: 0 },
    { q: "Te prezinți la un apel împreună cu un coleg, dar nu găsiți pe nimeni. Cum anunți?", a: ["M-callsign +1 10-11 ultimul apel", "M-callsign 10-11 locație", "M-callsign +1 10-55", "M-callsign 10-11 pacient dispărut"], correct: 0 },
    { q: "Precizează 3 coduri radio care se menționează pe dispecerat:", a: ["10-100 (motiv), 10-41, 10-42.", "10-1, 10-4, 10-20.", "10-13, 10-76, 10-95.", "Cod 0, Cod 4, 10-50."], correct: 0 },
    { q: "Ai preluat pacientul și acum te îndrepți spre spital. Cum anunți?", a: ["M-callsign, am un 10-95 conștient/inconștient, 10-76 către Spital Viceroy", "M-callsign, 10-76 spital", "M-callsign, 10-95 spital", "M-callsign +1, 10-76 către Viceroy"], correct: 0 },
    { q: "Ce semnifică codul 0 respectiv codul 4?", a: ["Cod 0: urgență majoră | Cod 4: un polițist are nevoie de ajutor", "Cod 0: accident | Cod 4: persoană decedată", "Cod 0: jaf în curs | Cod 4: medic în pericol", "Cod 0: regrupare | Cod 4: apel terminat"], correct: 0 },
    { q: "Ce semnifică codul radio 10-13 respectiv codul 10-76?", a: ["10-13: am preluat un BK4 (un caz) | 10-76: în drum spre", "10-13: accident | 10-76: locație", "10-13: ajutor medical | 10-76: pauză", "10-13: pacient preluat | 10-76: regrupare"], correct: 0 },
    { q: "Un coleg solicită un echipaj adițional pentru transport pacient. Cum anunți că te îndrepți la solicitare?", a: ["M-callsign, 10-76 ultimul 10-78.", "M-callsign, 10-1 la solicitare.", "M-callsign, 10-76 la coleg.", "M-callsign +1, 10-76 10-78."], correct: 0 },
    { q: "Ce semnifică codul 10-9 respectiv 10-100?", a: ["10-9: repetă | 10-100: închiderea stației (pauză/eveniment)", "10-9: confirm | 10-100: regrupare", "10-9: anulează | 10-100: accident", "10-9: locație | 10-100: pacient nou"], correct: 0 },
    { q: "Cum se anunță o regrupare pe helipadul spitalului?", a: ["M-callsign, 10-39 10-20 Helipad.", "M-callsign, 10-20 Helipad.", "M-callsign, regrupare Helipad.", "M-callsign, 10-39 la spital."], correct: 0 },
    { q: "Pacientul nu dorește transport la spital după primul ajutor. Cum anunți soluționarea?", a: ["M-callsign +1, 10-55.", "M-callsign, 10-55.", "M-callsign +1, 10-11.", "M-callsign, apel închis."], correct: 0 }
];

let currentQuestionIndex = 0;
let mistakes = 0;
let randomizedQuestions = [];
let selectedAnswer = null; // null = nimic selectat, true/false = valoarea raspunsului
let timeLeft = 120;
let timerInterval;
let testTerminat = false;

// ================= ANTI-CHEAT =================
document.addEventListener('visibilitychange', function() {
    if (document.hidden && !testTerminat) {
        clearInterval(timerInterval);
        failDueToCheating();
    }
});

function failDueToCheating() {
    testTerminat = true;
    const container = document.getElementById('quiz-container');
    container.innerHTML = `
        <div style="padding: 20px; border: 2px solid #ff3c00; border-radius: 15px;">
            <h1 style="color: #ff3c00; margin-bottom: 20px;">TEST ANULAT</h1>
            <p style="font-size: 1.2rem;">Ai părăsit pagina sau ai minimizat browserul.</p>
            <p style="color: #888; margin-top: 10px;">Tentativa de copiat a fost înregistrată.</p>
            <button class="start" style="margin-top:20px; background:#444;" onclick="window.location.href='index.html'">Înapoi</button>
        </div>
    `;
}

// ================= LOGICA TEST =================
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTimer() {
    timerInterval = setInterval(() => {
        if (testTerminat) return;
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        const timerEl = document.getElementById('timer');
        if(timerEl) {
            timerEl.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishTest(false);
        }
        timeLeft--;
    }, 1000);
}

function initTest() {
    randomizedQuestions = shuffle([...questionsData]).map(q => {
        let answers = q.a.map((text, index) => ({ text, isCorrect: index === q.correct }));
        return { ...q, mixedAnswers: shuffle(answers) };
    });
    startTimer();
    renderQuestion();
}

function renderQuestion() {
    selectedAnswer = null;
    const btnNext = document.getElementById('btn-next');
    const btnRevoke = document.getElementById('btn-revoke');
    
    if(btnNext) {
        btnNext.disabled = true;
        btnNext.style.opacity = "0.5";
        btnNext.style.cursor = "not-allowed";
    }
    if(btnRevoke) btnRevoke.style.display = "none";

    const qBox = document.getElementById('questionBox');
    const aBox = document.getElementById('answersBox');
    const currentQ = randomizedQuestions[currentQuestionIndex];

    document.getElementById('progress').innerText = `${currentQuestionIndex + 1}/${randomizedQuestions.length}`;
    document.getElementById('mistakes').innerText = `${mistakes}/3`;

    qBox.innerText = currentQ.q;
    aBox.innerHTML = '';

    currentQ.mixedAnswers.forEach((answer, index) => {
        const btn = document.createElement('button');
        btn.className = 'answerBtn';
        btn.innerText = answer.text;
        btn.id = `ans-${index}`;
        btn.onclick = () => selectOption(index, answer.isCorrect);
        aBox.appendChild(btn);
    });
}

function selectOption(index, isCorrect) {
    // DACĂ DEJA A SELECTAT CEVA, BLOCĂM ALTĂ SELECȚIE
    if (selectedAnswer !== null) return;

    selectedAnswer = isCorrect;
    
    // Vizual - dezactivăm restul butoanelor prin cursor
    document.querySelectorAll('.answerBtn').forEach(btn => {
        btn.style.borderColor = "rgba(255,255,255,0.1)";
        btn.style.background = "rgba(255,255,255,0.08)";
        btn.style.cursor = "not-allowed";
    });

    const selBtn = document.getElementById(`ans-${index}`);
    selBtn.style.borderColor = "#00c3ff";
    selBtn.style.background = "rgba(0, 195, 255, 0.1)";
    selBtn.style.cursor = "pointer";

    const btnNext = document.getElementById('btn-next');
    const btnRevoke = document.getElementById('btn-revoke');
    
    btnNext.disabled = false;
    btnNext.style.opacity = "1";
    btnNext.style.cursor = "pointer";
    btnRevoke.style.display = "block";
}

window.revokeAnswer = function() {
    selectedAnswer = null; // Permitem din nou selecția
    document.querySelectorAll('.answerBtn').forEach(btn => {
        btn.style.borderColor = "rgba(255,255,255,0.1)";
        btn.style.background = "rgba(255,255,255,0.08)";
        btn.style.cursor = "pointer";
    });
    const btnNext = document.getElementById('btn-next');
    btnNext.disabled = true;
    btnNext.style.opacity = "0.5";
    btnNext.style.cursor = "not-allowed";
    document.getElementById('btn-revoke').style.display = "none";
}

window.confirmAndNext = function() {
    if (selectedAnswer === false) {
        mistakes++;
    }

    if (mistakes >= 3) {
        return finishTest(false);
    }

    currentQuestionIndex++;
    if (currentQuestionIndex >= randomizedQuestions.length) {
        finishTest(true);
    } else {
        renderQuestion();
    }
}

function finishTest(passed) {
    testTerminat = true;
    clearInterval(timerInterval);
    const container = document.getElementById('quiz-container');
    const finalTime = document.getElementById('timer').innerText;

    if (passed) {
        container.innerHTML = `
            <div style="padding: 20px;">
                <h1 style="color: #00ff88; margin-bottom: 20px;">AI TRECUT TESTUL!</h1>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 25px;">
                    <p style="font-size: 1.2rem; margin: 10px 0;">Greșeli acumulate: <span style="color: #ff4444;">${mistakes}/3</span></p>
                    <p style="font-size: 1.2rem; margin: 10px 0;">Timp rămas: <span style="color: #00c3ff;">${finalTime}</span></p>
                </div>
                <button class="start" onclick="window.location.href='index.html'">Finalizează Autorizarea</button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="padding: 20px;">
                <h1 style="color: #ff3c00; margin-bottom: 20px;">DIN PĂCATE AI PICAT</h1>
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; margin-bottom: 25px;">
                    <p style="font-size: 1.2rem; margin: 10px 0;">Greșeli acumulate: <span style="color: #ff4444;">${mistakes}/3</span></p>
                    <p style="font-size: 1.2rem; margin: 10px 0;">Timp: <span style="color: #00c3ff;">${finalTime}</span></p>
                </div>
                <button class="start" style="background: #555;" onclick="window.location.href='index.html'">Am înțeles</button>
            </div>
        `;
    }
}

initTest();