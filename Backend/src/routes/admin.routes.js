const express = require('express');
const authenticate = require('../middlewares/auth.middleware');
const authorizeAdmin = require('../middlewares/admin.middleware');
const validate = require('../middlewares/validation.middleware');
const { imageUpload } = require('../middlewares/upload.middleware');
const parseProductBody = require('../middlewares/parseProductBody.middleware');
const { writeLimiter } = require('../middlewares/rateLimit.middleware');

const adminController = require('../controllers/admin.controller');
const categoryController = require('../controllers/category.controller');
const productController = require('../controllers/product.controller');
const couponController = require('../controllers/coupon.controller');
const orderController = require('../controllers/order.controller');
const uploadController = require('../controllers/upload.controller');
const reviewController = require('../controllers/review.controller');
const bannerController = require('../controllers/banner.controller');

const { createProductSchema, updateProductSchema } = require('../validators/product.validator');
const { createCouponSchema, updateCouponSchema } = require('../validators/coupon.validator');
const { updateOrderStatusSchema } = require('../validators/order.validator');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.listUsers);

router.post('/uploads', writeLimiter, imageUpload.single('image'), uploadController.uploadImage);
router.delete('/uploads', writeLimiter, uploadController.deleteUpload);

router.get('/categories', categoryController.listCategories);
router.post('/categories', categoryController.createCategory);
router.patch('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// PRODUCTS
router.get('/products', productController.adminListProducts);
router.get('/products/:id', productController.adminGetProduct);
router.post(
  '/products',
  imageUpload.array('images', 10),
  parseProductBody,
  validate(createProductSchema),
  productController.createProduct
);
router.patch(
  '/products/:id',
  imageUpload.array('images', 10),
  parseProductBody,
  validate(updateProductSchema),
  productController.updateProduct
);
router.delete('/products/:id', productController.deleteProduct);

router.post('/coupons', validate(createCouponSchema), couponController.createCoupon);
router.get('/coupons', couponController.listCoupons);
router.patch('/coupons/:id', validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/coupons/:id', couponController.deleteCoupon);

router.get('/banners', bannerController.adminListBanners);
router.post('/banners', bannerController.createBanner);
router.patch('/banners/:id', bannerController.updateBanner);
router.delete('/banners/:id', bannerController.deleteBanner);

router.get('/reviews', reviewController.adminListReviews);
router.patch('/reviews/:id', reviewController.adminModerateReview);

router.get('/orders', orderController.adminListOrders);
router.patch(
  '/orders/:id/status',
  validate(updateOrderStatusSchema),
  orderController.adminUpdateOrderStatus
);

module.exports = router;
