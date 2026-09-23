const productService = require('../services/product.service');
const { asyncHandler } = require('../utils/helpers');
const { sendSuccess } = require('../utils/response');

const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  return sendSuccess(res, {
    message: 'Products fetched successfully',
    data: result,
  });
});

const adminListProducts = asyncHandler(async (req, res) => {
  const result = await productService.listAdminProducts(req.query);
  return sendSuccess(res, {
    message: 'Products fetched successfully',
    data: result,
  });
});

const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await productService.getAdminProductById(req.params.id);
  return sendSuccess(res, {
    message: 'Product fetched successfully',
    data: { product },
  });
});

const getFeaturedProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 12;
  const products = await productService.getFeaturedProducts(limit);
  return sendSuccess(res, {
    message: 'Featured products fetched successfully',
    data: { products },
  });
});

const getProductsByCategory = asyncHandler(async (req, res) => {
  const result = await productService.getProductsByCategory(req.params.categoryId, req.query);
  return sendSuccess(res, {
    message: 'Category products fetched successfully',
    data: result,
  });
});

const getProductBySlug = asyncHandler(async (req, res) => {
  const product = await productService.getProductBySlug(req.params.slug);
  return sendSuccess(res, {
    message: 'Product fetched successfully',
    data: { product },
  });
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  return sendSuccess(res, {
    message: 'Product fetched successfully',
    data: { product },
  });
});

const createProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.files || []);
  return sendSuccess(res, {
    statusCode: 201,
    message: 'Product created successfully',
    data: { product },
  });
}, 'CREATE PRODUCT');

const updateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.files || []);
  return sendSuccess(res, {
    message: 'Product updated successfully',
    data: { product },
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await productService.softDeleteProduct(req.params.id);
  return sendSuccess(res, {
    message: 'Product deactivated successfully',
    data: { product },
  });
});

module.exports = {
  listProducts,
  adminListProducts,
  adminGetProduct,
  getFeaturedProducts,
  getProductsByCategory,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
