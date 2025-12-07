// -------------------------------
// NOV BOT — By kave & Eon
// -------------------------------

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const fs = require("fs-extra");

const app = express();
app.use(bodyParser.json());

// -------------------------------
// VARIÁVEIS DE AMBIENTE
// -------------------------------
const TOKEN = process.env.META_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_ID = process.env.PHONE_ID;

// -------------------------------
// Função para enviar mensagem
// -------------------------------
async function sendMessage(to, message) {
    try {
        await axios.post(
            `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: { body: message }
            },
            {
                headers: { Authorization: `Bearer ${TOKEN}` }
            }
        );
    } catch (err) {
        console.error("Erro ao enviar mensagem:", err?.response?.data || err);
    }
}

// -------------------------------
// Carregar arquivo de lista
// -------------------------------
async function loadList() {
    return fs.readJSON("presented.json");
}

async function saveList(list) {
    return fs.writeJSON("presented.json", list, { spaces: 4 });
}

// -------------------------------
// WEBHOOK — VALIDAÇÃO
// -------------------------------
app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
});

// -------------------------------
// WEBHOOK — RECEBER MENSAGENS
// -------------------------------
app.post("/webhook", async (req, res) => {
    try {
        const data = req.body;

        const entry = data.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        // ---------------------------
        // 1. DETECTAR SE ALGUÉM ENTROU NO GRUPO
        // ---------------------------
        const event = value?.events?.[0];
        if (event?.event === "group_joined") {
            const newMember = event.user; // número de quem entrou
            await sendMessage(newMember, "Bem-vindo, apresente-se com foto, nome e idade");
        }

        // ---------------------------
        // 2. MENSAGENS DE TEXTO COMANDOS
        // ---------------------------
        if (messages && messages.length > 0) {
            const msg = messages[0];
            const from = msg.from;
            const text = msg.text?.body || "";

            // Lista atual
            let list = await loadList();

            // ---- COMANDO: ADD ----
            if (text.startsWith("!apresentar")) {
                const name = text.replace("!apresentar", "").trim();

                if (!name) {
                    await sendMessage(from, "Use assim: !apresentar João");
                } else {
                    list.push(name);
                    await saveList(list);
                    await sendMessage(from, `${name} foi adicionado à lista de apresentados.`);
                }
            }

            // ---- COMANDO: LISTAR ----
            if (text === "!listados") {
                if (list.length === 0) {
                    await sendMessage(from, "Ninguém se apresentou ainda.");
                } else {
                    await sendMessage(from, "Lista de apresentados:\n\n" + list.join("\n"));
                }
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});

// -------------------------------
// SERVIDOR
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("NOV BOT rodando na porta " + PORT));
