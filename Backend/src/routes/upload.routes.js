const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const { imageUpload } = require('../middlewares/upload.middleware');
const { writeLimiter } = require('../middlewares/rateLimit.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

router.post('/', authenticate, writeLimiter, imageUpload.single('image'), uploadController.uploadImage);
router.delete('/', authenticate, writeLimiter, uploadController.deleteUpload);

module.exports = router;
