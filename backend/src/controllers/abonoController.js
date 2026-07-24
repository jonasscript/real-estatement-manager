const abonoService = require('../services/abonoService');
const { validationResult } = require('express-validator');

class AbonoController {
  async processAbono(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    try {
      const { clientId, purchaseId, abonoAmount, abonoType } = req.body;
      const processedBy = req.user.id;

      const proofBuffer = req.file ? req.file.buffer : null;
      const proofOriginalName = req.file ? req.file.originalname : null;
      const proofMimetype = req.file ? req.file.mimetype : null;

      const result = await abonoService.processAbono({
        clientId: parseInt(clientId),
        purchaseId: parseInt(purchaseId),
        abonoAmount: parseFloat(abonoAmount),
        abonoType,
        processedBy,
        proofBuffer,
        proofOriginalName,
        proofMimetype
      });

      res.status(201).json({
        message: 'Abono procesado correctamente. Las cuotas han sido recalculadas.',
        data: result
      });
    } catch (error) {
      console.error('Process abono error:', error);
      const status = error.message.startsWith('No hay') || error.message.startsWith('El monto') ? 400 : 500;
      res.status(status).json({ error: error.message || 'Error al procesar el abono' });
    }
  }

  async getAbonosByPurchase(req, res) {
    try {
      const { purchaseId } = req.params;
      const abonos = await abonoService.getAbonosByPurchase(parseInt(purchaseId));
      res.json({ message: 'Abonos retrieved', data: abonos });
    } catch (error) {
      console.error('Get abonos error:', error);
      res.status(500).json({ error: 'Error al obtener historial de abonos' });
    }
  }
}

module.exports = new AbonoController();
