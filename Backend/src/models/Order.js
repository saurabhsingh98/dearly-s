const mongoose = require('mongoose');
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  DELIVERY_TYPES,
} = require('../utils/constants');
const { money, moneyJson } = require('../utils/money');

const orderItemCustomizationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    type: { type: String, trim: true },
    value: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    imagePublicId: { type: String, trim: true },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    image: { type: String },
    price: money({ required: true }),
    quantity: { type: Number, required: true, min: 1 },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    variantLabel: { type: String, trim: true },
    customization: [orderItemCustomizationSchema],
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    landmark: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true },
    addressType: { type: String },
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, trim: true, unique: true, sparse: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: { type: shippingAddressSchema, required: true },
    subtotal: money({ required: true }),
    discount: money({ default: 0 }),
    deliveryFee: money({ default: 0 }),
    tax: money({ default: 0 }),
    totalAmount: money({ required: true }),
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    couponCode: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PLACED,
      index: true,
    },
    deliveryDate: { type: Date },
    deliverySlot: { type: String, trim: true },
    deliveryType: {
      type: String,
      enum: Object.values(DELIVERY_TYPES),
      default: DELIVERY_TYPES.STANDARD,
    },
    idempotencyKey: { type: String, trim: true },
    reservationExpiresAt: { type: Date },
    statusHistory: [statusHistorySchema],
  },
  { timestamps: true, ...moneyJson }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ reservationExpiresAt: 1 }, { sparse: true });
orderSchema.index({ userId: 1, createdAt: -1 });
// Partial rather than sparse: userId is always present, so a sparse compound index
// would index every key-less order and collide on null.
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);
