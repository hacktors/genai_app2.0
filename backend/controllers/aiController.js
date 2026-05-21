const { analyzeReceiptAI } = require('../services/geminiService');

exports.processReceipt = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Asset binary not found inside stream.' });
    }

    const fileUrl = req.file.path || req.file.secure_url;
    const fileSource = req.file.buffer || fileUrl;
    const payloadAI = await analyzeReceiptAI(fileSource, req.file.mimetype);
    return res.json({ ...payloadAI, receiptUrl: fileUrl || null });
  } catch (error) {
    return next(error);
  }
};
