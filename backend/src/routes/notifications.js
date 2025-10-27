const express = require('express');
const router = express.Router();
const pushService = require('../lib/pushNotifications');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Suscribir usuario a notificaciones
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    await pushService.saveSubscription(req.user.id, subscription);
    res.json({ success: true });
  } catch (error) {
    console.error('Error guardando suscripción:', error);
    res.status(500).json({ error: 'Error guardando suscripción' });
  }
});

// Endpoint para enviar notificación de prueba (solo admin)
router.post('/test/:userId', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    await pushService.sendToUser(parseInt(req.params.userId), {
      title: 'Notificación de Prueba',
      body: 'Esta es una notificación de prueba',
      icon: '/logo192.png'
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error enviando notificación:', error);
    res.status(500).json({ error: 'Error enviando notificación' });
  }
});

module.exports = router;