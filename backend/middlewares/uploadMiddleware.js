const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    return cb(null, true);
  }
  return cb(new Error('Unsupported asset format. Upload JPG, PNG, or PDF.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1000 * 1000 }
});

module.exports = upload;
