const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

let qrImageBase64 = '';
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  takeoverOnConflict: true,
  puppeteer: {
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--renderer-process-limit=1',
      '--disable-extensions'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('>>> NUEVO QR GENERADO EN ESPERA DE ESCANEO <<<');
  try {
    qrImageBase64 = await QRCode.toDataURL(qr);
  } catch (err) {
    console.error('Error QR:', err);
  }
});

client.on('authenticated', () => {
  console.log('>>> AUTENTICACIÓN EXITOSA EN WHATSAPP <<<');
});

client.on('ready', () => {
  console.log('==================================================');
  console.log('¡BOT WHATSAPP TOTALMENTE LISTO Y CONECTADO!');
  console.log('==================================================');
  isReady = true;
  qrImageBase64 = '';
});

client.on('auth_failure', () => {
  console.error('Error de autenticación');
  isReady = false;
});

client.initialize();

app.get('/', (req, res) => {
  if (isReady) {
    return res.send('<h1 style="color:green;text-align:center;margin-top:50px;font-family:sans-serif;">✅ WhatsApp está CONECTADO y activo.</h1>');
  }
  
  if (!qrImageBase64) {
    return res.send('<h1 style="text-align:center;margin-top:50px;font-family:sans-serif;">⏳ Iniciando motor de WhatsApp... aguarda unos segundos y recarga.</h1><script>setTimeout(()=>location.reload(), 5000);</script>');
  }

  res.send(`
    <div style="text-align:center;margin-top:30px;font-family:sans-serif;">
      <h1>Vincular WhatsApp del Bot</h1>
      <p>Escanea este código QR desde tu celular (WhatsApp > Dispositivos vinculados):</p>
      <div style="margin: 20px 0;">
        <img src="${qrImageBase64}" style="width:280px;height:280px;border:3px solid #075e54;border-radius:10px;padding:10px;background:#fff;" />
      </div>
      <p style="color:#666;"><i>La página se actualizará automáticamente una vez vinculado.</i></p>
    </div>
    <script>
      setInterval(async () => {
        try {
          let res = await fetch('/status');
          let data = await res.json();
          if(data.ready) location.reload();
        } catch(e) {}
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

app.listen(PORT, () => {
  console.log(`Servidor iniciado en puerto ${PORT}`);
});
