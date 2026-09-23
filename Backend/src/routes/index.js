const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const categoryRoutes = require('./category.routes');
const occasionRoutes = require('./occasion.routes');
const bannerRoutes = require('./banner.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const wishlistRoutes = require('./wishlist.routes');
const addressRoutes = require('./address.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const couponRoutes = require('./coupon.routes');
const reviewRoutes = require('./review.routes');
const uploadRoutes = require('./upload.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/occasions', occasionRoutes);
router.use('/banners', bannerRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/wishlist', wishlistRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/coupons', couponRoutes);
router.use('/reviews', reviewRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
