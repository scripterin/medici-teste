require('dotenv').config()
const express = require('express')
const session = require('express-session')
const axios = require("axios");
const path = require('path')
const crypto = require('crypto')

const app = express()

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// ================= SESSION =================
app.use(session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false // pune true dacă ai https
    }
}))

const codes = new Map()

// ================= DISCORD LOGIN =================
app.get('/auth/discord', (req, res) => {
    const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`
    res.redirect(url)
})

// ================= CALLBACK =================
app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code
    if (!code) return res.redirect('/')

    try {
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT_URI
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        )

        const userRes = await axios.get('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenRes.data.access_token}`
            }
        })

        req.session.user = userRes.data

        res.redirect('/dashboard.html')

    } catch (err) {
        console.error("Eroare Discord OAuth:", err.response?.data || err.message)
        res.redirect('/')
    }
})

// ================= DASHBOARD (AUTO LOGOUT ON REFRESH) =================
app.get('/dashboard.html', (req, res) => {
    if (!req.session.user) return res.redirect('/')

    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'), () => {
        req.session.destroy(() => {})
    })
})

// ================= API USER =================
app.get('/api/user', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Unauthorized" })
    }
    res.json(req.session.user)
})

// ================= WEBHOOK FUNCTION =================
async function sendWebhook(user, test, code) {
    const now = new Date()
    const formattedDate = now.toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })

    const webhookData = {
        embeds: [
            {
                title: "📝 Cerere nouă de test",
                color: 5814783,
                fields: [
                    { name: "Utilizator", value: `<@${user.id}>`, inline: true },
                    { name: "Test", value: `**${test}**`, inline: true },
                    { name: "Cod generat", value: `\`${code}\``, inline: false }
                ],
                footer: { text: `Departamentul Medical FPlayT - ${formattedDate}` }
            }
        ]
    }

    try {
        await axios.post(process.env.WEBHOOK_URL, webhookData, { headers: { 'Content-Type': 'application/json' } })
        console.log("Webhook trimis cu succes!")
    } catch (err) {
        console.error("Eroare la trimiterea webhook-ului:", err.response?.data || err.message)
    }
}

// ================= GENERARE COD =================
app.post('/api/generate', async (req, res) => {
    if (!req.session.user)
        return res.status(401).json({ error: "Unauthorized" })

    const { test } = req.body
    if (!test)
        return res.status(400).json({ error: "Test invalid" })

    const code = crypto.randomBytes(3).toString('hex').toUpperCase()
    const expire = Date.now() + 10 * 60 * 1000

    codes.set(code, { user: req.session.user, test, expire })

    await sendWebhook(req.session.user, test, code)

    res.json({ code })
})

// ================= CLEANUP CODURI EXPIRATE =================
setInterval(() => {
    for (let [code, data] of codes) {
        if (Date.now() > data.expire) {
            codes.delete(code)
        }
    }
}, 60000)

// ================= WEBHOOK FUNCTION REZULTATE =================
async function sendTestResult(user, test, score) {
    const now = new Date()
    const formattedDate = now.toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    const embed = {
        title: "📊 Rezultat Test",
        color: 3066993,
        fields: [
            { name: "Utilizator", value: `<@${user.id}>`, inline: true },
            { name: "Test", value: `**${test}**`, inline: true },
            { name: "Rezultat", value: `**${score}%**`, inline: false }
        ],
        footer: { text: `Departamentul Medical FPlayT - ${formattedDate}` }
    }

    try {
        await axios.post(process.env.WEBHOOK_REZULTATE, { embeds: [embed] }, { headers: { 'Content-Type': 'application/json' } })
        console.log("Rezultat test trimis cu succes!")
    } catch (err) {
        console.error("Eroare la trimiterea rezultatului test:", err.response?.data || err.message)
    }
}

// ================= WEBHOOK FUNCTION TRANSCRIPT =================
async function sendDrivingTranscript(user, test, transcript, totalMistakes, remainingTime, passed) {
    const now = new Date()
    const formattedDate = now.toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    const fields = transcript.map((t,i) => ({
        name: `Întrebare ${i+1}: ${t.question}`,
        value: `Răspuns: \`${t.answer}\`\nCorect: \`${t.correct}\``,
        inline: false
    }))

    fields.push(
        { name: "Total greșeli", value: `${totalMistakes}`, inline: true },
        { name: "Timp rămas", value: `${remainingTime} sec`, inline: true },
        { name: "Rezultat final", value: passed ? "✅ Promovat" : "❌ Picat", inline: false }
    )

    const embed = {
        title: "📝 Transcript Conducere",
        color: passed ? 3066993 : 15158332,
        fields,
        footer: { text: `Departamentul Medical FPlayT - ${formattedDate}` }
    }

    try {
        await axios.post(process.env.WEBHOOK_CONDUCERE, { embeds: [embed] }, { headers: { 'Content-Type': 'application/json' } })
        console.log("Transcript conducere trimis cu succes!")
    } catch (err) {
        console.error("Eroare la trimiterea transcriptului:", err.response?.data || err.message)
    }
}

// ================= API REZULTATE =================
app.post('/api/test-result', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })

    const { test, score } = req.body
    if (!test || typeof score !== 'number') return res.status(400).json({ error: "Date invalide" })

    await sendTestResult(req.session.user, test, score)
    res.json({ success: true })
})

// ================= API TRANSCRIPT CONDUCERE =================
app.post('/api/driving-transcript', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })

    const { test, transcript, totalMistakes, remainingTime, passed } = req.body
    if (!test || !Array.isArray(transcript) || typeof totalMistakes !== 'number' || typeof remainingTime !== 'number' || typeof passed !== 'boolean') {
        return res.status(400).json({ error: "Date invalide" })
    }

    await sendDrivingTranscript(req.session.user, test, transcript, totalMistakes, remainingTime, passed)
    res.json({ success: true })
})

// ================= START SERVER =================
app.listen(3000, () => {
    console.log("Server pornit pe http://localhost:3000")
})