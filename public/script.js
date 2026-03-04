/**
 * =================================================
 * PROTECȚIE ȘI AUTORIZARE (DASHBOARD REDIRECT)
 * =================================================
 */
if (window.location.pathname.includes("dashboard.html")) {
    fetch('/api/user')
    .then(res => {
        if (!res.ok) window.location.href = "index.html";
    })
    .catch(() => {
        window.location.href = "index.html";
    });
}

/**
 * =================================================
 * SISTEM NOTIFICĂRI (TOAST) - MODIFICAT
 * =================================================
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '✔';
    if (type === 'error') icon = '✖';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        </div>
        <span class="toast-close">&times;</span>
    `;

    container.appendChild(toast);

    // Apariție cu animație
    setTimeout(() => toast.classList.add('show'), 10);

    // Dispare automat după 5 secunde
    const autoDismiss = setTimeout(() => dismissToast(toast), 5000);

    // Dispare instant dacă apăsăm X
    toast.querySelector('.toast-close').addEventListener('click', () => {
        clearTimeout(autoDismiss);
        dismissToast(toast);
    });
}

function dismissToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
        if (toast.parentElement) toast.remove();
    });
}

function dismissToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
}

// ================= Select Test =================
let selectedTest = null;

function selectTest(elem) {
    selectedTest = elem.innerText.trim();
    document.querySelectorAll('.test').forEach(t => t.classList.remove('selected'));
    elem.classList.add('selected');
    showToast(`Ai selectat testul: ${selectedTest}`, 'success');
}

// ================= Populează card user =================
fetch('/api/user')
.then(res => {
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
})
.then(user => {
    const userCard = document.getElementById("userCard");
    if (userCard) {
        userCard.innerHTML = `
            <img src="emt.png" class="avatar">
            <div>
                <div>@${user.username}</div>
            </div>
        `;
    }
})
.catch(() => console.warn("Sesiune vizitator."));

// ================= Generează cod cu Cooldown =================
function generate(test) {
    if (!test) return showToast("Selectează mai întâi un test!", "warning");

    const lastRequest = localStorage.getItem(`lastRequest_${test}`);
    const now = Date.now();
    const cooldown = 2 * 60 * 1000;

    if (lastRequest && (now - lastRequest < cooldown)) {
        const remainingSeconds = Math.ceil((cooldown - (now - lastRequest)) / 1000);
        return showToast(`Ai solicitat deja un cod pentru ${test}! Mai așteaptă ${remainingSeconds} secunde.`, "error");
    }

    fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showToast("Eroare: " + data.error, "error");
        } else {
            localStorage.setItem(`lastRequest_${test}`, Date.now());
            showToast("Cod generat cu succes! Așteaptă confirmarea unui HR.", "success");
        }
    })
    .catch(() => showToast("Eroare server la generare.", "error"));
}

// ================= Începe Testul (Verificare One-Use) =================
async function startTestWithCode() {
    const codeInput = document.querySelector('.code-box input').value.trim();
    if (!selectedTest) return showToast("Selectează un test!", "warning");
    if (!codeInput) return showToast("Introdu codul!", "warning");

    try {
        const response = await fetch('/api/verify-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeInput, test: selectedTest.toUpperCase() })
        });

        const data = await response.json();

        if (data.success) {
            proceedToTest(codeInput);
        } else {
            showToast("Eroare: " + (data.message || "Cod invalid sau deja folosit!"), "error");
        }

    } catch (error) {
        console.error("Server fallback activat.");
        const usedCodes = JSON.parse(localStorage.getItem('usedCodes') || "[]");

        if (usedCodes.includes(codeInput)) {
            showToast("Acest cod a fost deja folosit!", "error");
        } else {
            usedCodes.push(codeInput);
            localStorage.setItem('usedCodes', JSON.stringify(usedCodes));
            proceedToTest(codeInput);
        }
    }
}

function proceedToTest(code) {
    sessionStorage.setItem('activeCode', code);
    const pages = {
        "RADIO": "radio.html",
        "BLS": "bls-test.html",
        "REZIDENȚIAT": "rezidentiat-test.html",
        "SMURD TEORETIC": "smurd-test.html"
    };
    const target = pages[selectedTest.toUpperCase()];
    if (target) {
        showToast("Cod validat! Te redirecționăm...", "success");
        setTimeout(() => window.location.href = target, 1000);
    } else {
        showToast("Pagina testului nu a fost găsită.", "error");
    }
}

// ================= Overlay Reguli (RESTAURAT) =================
const timerEl = document.getElementById("timer");
const progressBar = document.getElementById("timerProgress");
const checkboxContainer = document.getElementById("checkboxContainer");
const acceptCheckbox = document.getElementById("acceptRules");
const accessBtnContainer = document.getElementById("accessBtnContainer");
const rulesOverlay = document.getElementById("rulesOverlay");
const rulesCard = document.getElementById("rulesCard");

if (rulesOverlay) {
    rulesOverlay.classList.add('show');
    if(rulesCard) rulesCard.classList.add('show');

    let countdown = 5; 
    let progressValue = 0;
    const interval = setInterval(() => {
        countdown--;
        if (timerEl) timerEl.textContent = countdown;

        if (progressBar) {
            progressValue += 20;
            progressBar.style.width = progressValue + "%";
        }

        if (countdown <= 0) {
            clearInterval(interval);
            if (timerEl) {
                timerEl.style.transition = 'opacity 0.5s ease';
                timerEl.style.opacity = 0;
            }
            if (progressBar) progressBar.style.opacity = 0;

            setTimeout(() => {
                if (checkboxContainer) {
                    checkboxContainer.style.display = "block";
                    checkboxContainer.classList.add('show');
                }
            }, 500);
        }
    }, 1000);
}

// Evenimente Bifa Regulament
if (acceptCheckbox) {
    acceptCheckbox.addEventListener('change', () => {
        if (acceptCheckbox.checked) {
            accessBtnContainer.style.display = "block";
            setTimeout(() => accessBtnContainer.classList.add('show'), 50);
        } else {
            accessBtnContainer.classList.remove('show');
            setTimeout(() => accessBtnContainer.style.display = "none", 300);
        }
    });
}

const accessBtn = document.getElementById("accessBtn");
if (accessBtn) {
    accessBtn.addEventListener('click', () => {
        rulesOverlay.style.transition = 'opacity 0.5s ease';
        rulesOverlay.style.opacity = 0;
        setTimeout(() => rulesOverlay.style.display = "none", 500);
    });
}