// ================= Select Test =================
let selectedTest = null;

function selectTest(elem) {
    selectedTest = elem.innerText.trim();
    document.querySelectorAll('.test').forEach(t => t.classList.remove('selected'));
    elem.classList.add('selected');
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
    if (!test) return alert("Selectează mai întâi un test!");

    const lastRequest = localStorage.getItem(`lastRequest_${test}`);
    const now = Date.now();
    const cooldown = 2 * 60 * 1000;

    if (lastRequest && (now - lastRequest < cooldown)) {
        const remainingSeconds = Math.ceil((cooldown - (now - lastRequest)) / 1000);
        return alert(`Ai solicitat deja un cod pentru ${test}! Mai așteaptă ${remainingSeconds} secunde.`);
    }

    fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert("Eroare: " + data.error);
        } else {
            localStorage.setItem(`lastRequest_${test}`, Date.now());
            alert("Cod generat cu succes! Așteaptă confirmarea unui HR.");
        }
    })
    .catch(() => alert("Eroare server la generare."));
}

// ================= Începe Testul (Verificare One-Use) =================
async function startTestWithCode() {
    const codeInput = document.querySelector('.code-box input').value.trim();
    if (!selectedTest) return alert("Selectează un test!");
    if (!codeInput) return alert("Introdu codul!");

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
            alert("Eroare: " + (data.message || "Cod invalid sau deja folosit!"));
        }

    } catch (error) {
        // Fallback dacă serverul nu are ruta setată (Linia 118 fix)
        console.error("Server fallback activat.");
        const usedCodes = JSON.parse(localStorage.getItem('usedCodes') || "[]");

        if (usedCodes.includes(codeInput)) {
            alert("Acest cod a fost deja folosit!");
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
    if (target) window.location.href = target;
    else alert("Pagina testului nu a fost găsită.");
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
    rulesCard.classList.add('show');

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