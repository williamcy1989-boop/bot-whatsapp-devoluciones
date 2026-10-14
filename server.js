const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

let qrImageBase64 = '';
let isReady = false;

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

// Guardar QR como imagen
client.on('qr', async (qr) => {
  console.log('Nuevo QR generado. Accede a la URL para escanearlo.');
  try {
    qrImageBase64 = await QRCode.toDataURL(qr);
  } catch (err) {
    console.error('Error al generar imagen QR:', err);
  }
});

client.on('ready', () => {
  console.log('==================================================');
  console.log('¡CLIENTE DE WHATSAPP CONECTADO Y LISTO!');
  console.log('==================================================');
  isReady = true;
  qrImageBase64 = '';
});

client.on('auth_failure', () => {
  isReady = false;
});

client.initialize();

// Ruta visual para escanear el QR desde el navegador
app.get('/', (req, res) => {
  if (isReady) {
    return res.send('<h1 style="color:green;text-align:center;margin-top:50px;">✅ WhatsApp está CONECTADO y activo.</h1>');
  }
  
  if (!qrImageBase64) {
    return res.send('<h1 style="text-align:center;margin-top:50px;">⏳ Generando código QR, recarga la página en unos segundos...</h1><script>setTimeout(()=>location.reload(), 3000);</script>');
  }

  res.send(`
    <div style="text-align:center;margin-top:30px;font-family:sans-serif;">
      <h1>Vincular WhatsApp del Bot</h1>
      <p>Escanea este código QR con la cámara de WhatsApp de tu celular:</p>
      <img src="${qrImageBase64}" style="width:300px;height:300px;border:2px solid #000;" />
      <p><i>Esta página se actualizará automáticamente al conectarse.</i></p>
    </div>
    <script>
      setInterval(async () => {
        let res = await fetch('/status');
        let data = await res.json();
        if(data.ready) location.reload();
      }, 3000);
    </script>
  `);
});

app.get('/status', (req, res) => {
  res.json({ ready: isReady });
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
