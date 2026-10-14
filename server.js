const express = require('express');
const cors = require('cors');
const app = express();

// Middlewares para procesar solicitudes JSON y URL Encoded
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Puerto dinámico asignado por Render o puerto 3000 por defecto para local
const PORT = process.env.PORT || 3000;

// Ruta principal para comprobación de estado (Health Check)
app.get('/', (req, res) => {
  res.status(200).send('Servidor de WhatsApp Webhooks activo y en ejecucion.');
});

// Endpoint principal para el envío de notificaciones de WhatsApp
app.post('/enviar-whatsapp', async (req, res) => {
  try {
    const { chatId, mensaje } = req.body;

    // Validación básica de parámetros recibidos
    if (!chatId || !mensaje) {
      return res.status(400).json({
        status: 'error',
        mensaje: 'Faltan parametros obligatorios: chatId o mensaje.'
      });
    }

    console.log(`[${new Date().toISOString()}] Solicitud recibida:`);
    console.log(`Chat ID: ${chatId}`);
    console.log(`Mensaje: ${mensaje}`);

    // AQUÍ VA TU LÓGICA DE ENVÍO DE WHATSAPP 
    // (Ejemplo: client.sendMessage(chatId, mensaje) si usas whatsapp-web.js o Baileys)

    return res.status(200).json({
      status: 'ok',
      mensaje: 'Notificacion procesada exitosamente'
    });

  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return res.status(500).json({
      status: 'error',
      mensaje: 'Error interno del servidor',
      error: error.message
    });
  }
});

// Escuchar en el puerto asignado
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`Servidor iniciado en el puerto ${PORT}`);
  console.log(`=================================`);
});