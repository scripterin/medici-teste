require('dotenv').config()
const express = require('express')
const cookieSession = require('cookie-session')
const axios = require('axios')
const path = require('path')
const crypto = require('crypto')
const serverless = require('serverless-http')

const app = express()

// ================= MIDDLEWARE =================
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// ================= COOKIE SESSION =================
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'supersecret'],
    maxAge: 24 * 60 * 60 * 1000, // 1 zi
    httpOnly: true,
    secure: true // true dacă folosești HTTPS
}))

// ================= HOMEPAGE / =================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

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
            headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
        })

        req.session.user = userRes.data
        res.redirect('/dashboard.html')

    } catch (err) {
        console.error("Eroare Discord OAuth:", err.response?.data || err.message)
        res.redirect('/')
    }
})

// ================= DASHBOARD =================
app.get('/dashboard.html', (req, res) => {
    if (!req.session.user) return res.redirect('/')
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

// ================= API USER =================
app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })
    res.json(req.session.user)
})

// ================= WEBHOOK =================
async function sendWebhook(user, test, code) {
    const now = new Date()
    const formattedDate = now.toLocaleString('ro-RO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
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
        console.error("Eroare webhook:", err.response?.data || err.message)
    }
}

// ================= GENERARE COD =================
app.post('/api/generate', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" })

    const { test } = req.body
    if (!test) return res.status(400).json({ error: "Test invalid" })

    const code = crypto.randomBytes(3).toString('hex').toUpperCase()

    // Nu mai folosim memory store → salvează cod pe frontend sau DB extern dacă vrei persistent
    await sendWebhook(req.session.user, test, code)
    res.json({ code })
})

// ================= EXPORT SERVER PENTRU VERCEL =================
module.exports = serverless(app)