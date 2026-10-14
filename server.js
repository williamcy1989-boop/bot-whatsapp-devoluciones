const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// Inicialización del cliente de WhatsApp adaptado para entornos en la nube (Render)
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
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

// Generación de código QR en la consola de Render
client.on('qr', (qr) => {
  console.log('==================================================');
  console.log('ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
  console.log('==================================================');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('==================================================');
  console.log('¡CLIENTE DE WHATSAPP CONECTADO Y LISTO!');
  console.log('==================================================');
});

client.on('auth_failure', (msg) => {
  console.error('Error de autenticación en WhatsApp:', msg);
});

client.initialize();

// Ruta de estado
app.get('/', (req, res) => {
  res.status(200).send('Servidor WhatsApp en Render activo.');
});

// Endpoint para recibir la notificación desde Google Apps Script
app.post('/enviar-whatsapp', async (req, res) => {
  try {
    const { chatId, mensaje } = req.body;

    if (!chatId || !mensaje) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Faltan parámetros obligatorios: chatId o mensaje.'
      });
    }

    // Formatear ID si es necesario (para grupos o números)
    let formattedChatId = chatId.includes('@') ? chatId : `${chatId}@g.us`;

    console.log(`Enviando mensaje a ${formattedChatId}...`);
    await client.sendMessage(formattedChatId, mensaje);

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Notificación enviada exitosamente a WhatsApp'
    });

  } catch (error) {
    console.error('Error al enviar el mensaje por WhatsApp:', error);
    return res.status(500).json({
      status: 'error',
      mensaje: 'Error interno al enviar mensaje',
      error: error.message
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor HTTP iniciado en puerto ${PORT}`);
});