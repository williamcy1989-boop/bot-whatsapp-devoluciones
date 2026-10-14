const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

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
      '--single-process',
      '--disable-gpu'
    ]
  }
});

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

client.initialize();

app.get('/', (req, res) => {
  res.status(200).send('Servidor activo');
});

app.post('/enviar-whatsapp', async (req, res) => {
  try {
    const { chatId, mensaje } = req.body;
    if (!chatId || !mensaje) {
      return res.status(400).json({ status: 'error', mensaje: 'Faltan parámetros.' });
    }
    let formattedChatId = chatId.includes('@') ? chatId : `${chatId}@g.us`;
    await client.sendMessage(formattedChatId, mensaje);
    return res.status(200).json({ status: 'ok', mensaje: 'Enviado correctamente.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
