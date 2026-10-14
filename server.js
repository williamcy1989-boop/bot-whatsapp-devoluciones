const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n👇 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n==================================================');
    console.log('✅ ¡Servidor de WhatsApp conectado y listo!');
    console.log('📌 Escribe "!id" en tu grupo para ver su ID en esta pantalla.');
    console.log('==================================================\n');
});

// Capturar el ID directo desde las propiedades del mensaje
client.on('message_create', async (msg) => {
    try {
        if (msg.body === '!id') {
            // Identificar si el mensaje proviene o va dirigido a un grupo (@g.us)
            const idChat = msg.from.endsWith('@g.us') ? msg.from : (msg.to.endsWith('@g.us') ? msg.to : null);

            if (idChat) {
                console.log('\n--------------------------------------------------');
                console.log(`🎯 ¡GRUPO DETECTADO!`);
                console.log(`🆔 ID EXACTO PARA USAR EN GOOGLE APPS SCRIPT:`);
                console.log(`${idChat}`);
                console.log('--------------------------------------------------\n');

                await client.sendMessage(idChat, `El ID de este grupo es:\n${idChat}`);
            } else {
                console.log('\n⚠️ El comando !id debe ser enviado dentro de un GRUPO de WhatsApp.\n');
            }
        }
    } catch (err) {
        console.error('Error al procesar !id:', err);
    }
});

app.post('/enviar-whatsapp', async (req, res) => {
    try {
        const { chatId, mensaje, message } = req.body;
        const textoEnviar = mensaje || message;
        
        if (!chatId || !textoEnviar) {
            return res.status(400).send({ status: 'error', message: 'Faltan datos requeridos' });
        }

        await client.sendMessage(chatId, textoEnviar);
        console.log(`📩 [${new Date().toLocaleTimeString()}] Notificación enviada al grupo.`);
        res.status(200).send({ status: 'ok' });
    } catch (error) {
        console.error('❌ Error enviando mensaje por WhatsApp:', error);
        res.status(500).send({ status: 'error', details: error.toString() });
    }
});

const PUERTO = 3000;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor en http://localhost:${PUERTO}`);
});

client.initialize();