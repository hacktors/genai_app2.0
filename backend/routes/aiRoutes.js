const express = require('express');
const { processReceipt } = require('../controllers/aiController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.post('/analyze', protect, upload.single('receipt'), processReceipt);

module.exports = router;
