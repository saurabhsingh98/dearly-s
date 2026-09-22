const { isCloudinaryConfigured } = require('../config/cloudinary');
const { asyncHandler } = require('../utils/helpers');
const { sendSuccess } = require('../utils/response');
const { uploadBufferToCloudinary, deleteCloudinaryAsset } = require('../utils/upload');

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    const error = new Error('Image file is required');
    error.statusCode = 400;
    throw error;
  }

  if (!isCloudinaryConfigured()) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 503;
    throw error;
  }

  const folder = req.query.purpose === 'product' ? 'dearlys/products' : 'dearlys/uploads';
  const uploaded = await uploadBufferToCloudinary(req.file.buffer, folder);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Image uploaded successfully',
    data: uploaded,
  });
});

const isDeletablePublicId = (publicId) =>
  typeof publicId === 'string' &&
  (publicId.startsWith('dearlys/products/') || publicId.startsWith('dearlys/uploads/'));

const deleteUpload = asyncHandler(async (req, res) => {
  const publicId = req.query.publicId;
  if (!isDeletablePublicId(publicId)) {
    const error = new Error('Invalid or missing publicId');
    error.statusCode = 400;
    throw error;
  }

  if (!isCloudinaryConfigured()) {
    const error = new Error('Cloudinary is not configured');
    error.statusCode = 503;
    throw error;
  }

  await deleteCloudinaryAsset(publicId);
  return sendSuccess(res, {
    message: 'Image deleted successfully',
    data: { publicId },
  });
});

module.exports = { uploadImage, deleteUpload };
