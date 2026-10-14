const express = require('express');
const cors = require('cors');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

let qrImageBase64 = '';
let isReady = false;
let sock;

// Carpeta donde se guarda la sesión permanente
const AUTH_DIR = path.join(__dirname, 'baileys_auth_info');

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Bot Devoluciones', 'Chrome', '1.0.0'],
    keepAliveIntervalMs: 30000, // Enviar keep-alive cada 30 seg para mantener el socket activo
    connectTimeoutMs: 60000
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('>>> NUEVO CÓDIGO QR GENERADO <<<');
      try {
        qrImageBase64 = await QRCode.toDataURL(qr);
      } catch (err) {
        console.error('Error generando QR:', err);
      }
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`Conexión cerrada (Código ${statusCode}). Reconectando: ${shouldReconnect}`);
      isReady = false;

      if (shouldReconnect) {
        // Intentar reconectar automáticamente de inmediato
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('Sesión cerrada desde el celular. Limpiando credenciales...');
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      console.log('==================================================');
      console.log('¡BOT DE WHATSAPP SESIÓN PERMANENTE ACTIVA!');
      console.log('==================================================');
      isReady = true;
      qrImageBase64 = '';
    }
  });
}

connectToWhatsApp();

app.get('/', (req, res) => {
  if (isReady) {
    return res.send('<h1 style="color:green;text-align:center;margin-top:50px;font-family:sans-serif;">✅ WhatsApp está PERMANENTEMENTE CONECTADO.</h1>');
  }
  
  if (!qrImageBase64) {
    return res.send('<h1 style="text-align:center;margin-top:50px;font-family:sans-serif;">⏳ Conectando sesión de WhatsApp... aguarde unos segundos.</h1><script>setTimeout(()=>location.reload(), 4000);</script>');
  }

  res.send(`
    <div style="text-align:center;margin-top:30px;font-family:sans-serif;">
      <h1>Vincular WhatsApp del Bot (Sesión Permanente)</h1>
      <p>Escanea este código QR desde tu celular (WhatsApp > Dispositivos vinculados):</p>
      <div style="margin: 20px 0;">
        <img src="${qrImageBase64}" style="width:280px;height:280px;border:3px solid #075e54;border-radius:10px;padding:10px;background:#fff;" />
      </div>
      <p style="color:#666;"><i>Una vez vinculado, la sesión no se volverá a cerrar.</i></p>
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
      return res.status(400).json({ status: 'error', mensaje: 'Faltan parámetros obligatorios.' });
    }
    if (!isReady) {
      return res.status(503).json({ status: 'error', mensaje: 'El servicio de WhatsApp se está reconectando, intenta de nuevo en 5 segundos.' });
    }

    let formattedChatId = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    if (chatId.includes('-') && !chatId.includes('@')) {
      formattedChatId = `${chatId}@g.us`;
    }

    await sock.sendMessage(formattedChatId, { text: mensaje });
    return res.status(200).json({ status: 'ok', mensaje: 'Enviado correctamente.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});
