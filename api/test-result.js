/**
 * =================================================
 * API HANDLER - TRIMITERE REZULTATE DISCORD
 * =================================================
 */

export default async function handler(req, res) {
    // Permitem doar cereri de tip POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Metoda nepermisă" });
    }

    const {
        username,
        testType,
        score,
        total,
        passed,
        timeUsed,
        wrongAnswers
    } = req.body;

    // ⚠️ ÎNLOCUIEȘTE link-urile de mai jos cu Webhook-urile tale reale de la Discord
    const WEBHOOK_REZULTATE = "https://discord.com/api/webhooks/1478731021984862309/jHhRyfX94YhZ5xm__kvsrewqzb9mY0bkCbkTd8ncfbUzT_r8s3SiJaIhGtdwTpKkrMEo"; 
    const WEBHOOK_CONDUCERE = "https://discord.com/api/webhooks/1478731142822887525/MdfOLV3TRq5DSZvxJmkB2yvq-V2NDeTT8_VPQCscKSgCkeva3yTxtgRlbF4m97FdruzM";

    const color = passed ? 5763719 : 15548997; // Verde pentru Admis, Roșu pentru Respins
    const status = passed ? "✅ ADMIS" : "❌ RESPINS";

    // 1. EMBED PENTRU CANALUL DE REZULTATE (Public/General)
    const embedRezultat = {
        title: "📋 Rezultat Test Nou",
        color: color,
        fields: [
            { name: "👤 Utilizator", value: `@${username}`, inline: true },
            { name: "📝 Tip Test", value: testType, inline: true },
            { name: "📊 Scor Obținut", value: `**${score} / ${total}** (${status})`, inline: true }
        ],
        footer: { text: "Sistem Automatizări" },
        timestamp: new Date()
    };

    // 2. TRANSCRIPT PENTRU CONDUCERE (Detalii greșeli)
    let transcriptText = "Nicio greșeală înregistrată.";
    if (wrongAnswers && wrongAnswers.length > 0) {
        transcriptText = wrongAnswers.map((w, i) => 
            `**${i + 1}. ${w.question}**\n↳ Răspuns dat: \`${w.selected}\`\n↳ Răspuns corect: \`${w.correct}\``
        ).join("\n\n");
    }

    const embedConducere = {
        title: "📑 Transcript Detaliat",
        color: color,
        description: `Candidatul **${username}** a finalizat testul **${testType}**.`,
        fields: [
            { name: "⏱ Timp Folosit / Status", value: timeUsed, inline: true },
            { name: "📊 Rezultat Final", value: `${score}/${total}`, inline: true },
            { name: "📄 Analiză Greșeli", value: transcriptText.substring(0, 2048) } // Limitare Discord
        ],
        timestamp: new Date()
    };

    try {
        // Trimitem ambele mesaje în paralel
        await Promise.all([
            fetch(WEBHOOK_REZULTATE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ embeds: [embedRezultat] })
            }),
            fetch(WEBHOOK_CONDUCERE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ embeds: [embedConducere] })
            })
        ]);

        return res.status(200).json({ success: true, message: "Trimis pe Discord" });
    } catch (error) {
        console.error("Eroare Webhook Discord:", error);
        return res.status(500).json({ error: "Nu s-a putut trimite la Discord" });
    }
}