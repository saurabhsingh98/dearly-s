const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Product = require('../models/Product');
const Counter = require('../models/Counter');
const {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  TAX_RATE,
} = require('../utils/constants');
const productService = require('./product.service');
const inventoryService = require('./inventory.service');
const couponService = require('./coupon.service');
const deliveryService = require('./delivery.service');
const reservationService = require('./reservation.service');
const { round2 } = require('../utils/money');

// Required lazily: payment.service requires this module back.
const refundAfterCommit = (orderId) => require('./payment.service').refundOrderPayment(orderId);

const nextOrderNumber = async (session) => {
  const counter = await Counter.findByIdAndUpdate(
    'order',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return `DRL-${String(counter.seq).padStart(6, '0')}`;
};

const recordStatus = (order, status, { by, note } = {}) => {
  order.orderStatus = status;
  order.statusHistory.push({ status, at: new Date(), by, note });
};

const orderHasPersonalizedItems = (order) =>
  (order.items || []).some((item) => (item.customization || []).length > 0);

const assertOrderCanBeCancelledOrRefunded = (order) => {
  if (!orderHasPersonalizedItems(order)) return;
  const error = new Error(
    'Orders containing personalised items cannot be cancelled or refunded online'
  );
  error.statusCode = 400;
  throw error;
};

// Shared by customer cancellation and the admin transition so stock and refund
// state can never be skipped by going through the admin path.
const applyCancellation = async (order, session, actor) => {
  assertOrderCanBeCancelledOrRefunded(order);
  const wasPaid = order.paymentStatus === PAYMENT_STATUS.PAID;

  for (const item of order.items) {
    const args = {
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      session,
    };
    await (wasPaid ? inventoryService.restoreStock(args) : inventoryService.releaseStock(args));
  }

  if (order.couponId) {
    await couponService.releaseRedemption({ couponId: order.couponId, userId: order.userId }, session);
  }

  order.reservationExpiresAt = undefined;

  if (wasPaid) {
    order.paymentStatus = PAYMENT_STATUS.REFUNDED;
    recordStatus(order, ORDER_STATUS.REFUNDED, actor);
  } else {
    recordStatus(order, ORDER_STATUS.CANCELLED, actor);
  }
};

const buildOrderItemsFromCart = async (cart, session) => {
  const items = [];

  for (const cartItem of cart.items) {
    const product = await Product.findById(cartItem.productId).session(session);
    if (!product || !product.isActive) {
      const error = new Error(`Product ${cartItem.productId} is unavailable`);
      error.statusCode = 400;
      throw error;
    }

    const variant = cartItem.variantId ? product.variants.id(cartItem.variantId) : null;
    if (cartItem.variantId && !variant) {
      const error = new Error('Invalid variant in cart');
      error.statusCode = 400;
      throw error;
    }

    productService.validateCustomizationInput(product, cartItem.customization);
    await inventoryService.checkAvailability({
      productId: product._id,
      variantId: cartItem.variantId,
      quantity: cartItem.quantity,
      session,
    });

    const unitPrice = productService.getUnitPrice(product, variant);
    const image = variant?.images?.[0]?.url || product.images?.[0]?.url || null;

    items.push({
      productId: product._id,
      productName: product.name,
      image,
      price: round2(unitPrice),
      quantity: cartItem.quantity,
      variantId: cartItem.variantId,
      variantLabel: variant?.label || null,
      customization: cartItem.customization || [],
    });
  }

  return items;
};

const createOrderFromCart = async (userId, payload, idempotencyKey) => {
  if (idempotencyKey) {
    const replay = await Order.findOne({ userId, idempotencyKey });
    if (replay) {
      return { order: replay, payment: null, replayed: true };
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cart = await Cart.findOne({ userId }).session(session);
    if (!cart || !cart.items.length) {
      const error = new Error('Cart is empty');
      error.statusCode = 400;
      throw error;
    }

    const address = await Address.findOne({ _id: payload.addressId, userId }).session(session);
    if (!address) {
      const error = new Error('Shipping address not found');
      error.statusCode = 404;
      throw error;
    }

    deliveryService.validateDeliveryDate({
      deliveryType: payload.deliveryType,
      deliveryDate: payload.deliveryDate,
    });
    deliveryService.validateDeliverySlot({
      deliveryType: payload.deliveryType,
      deliverySlot: payload.deliverySlot,
    });

    const orderItems = await buildOrderItemsFromCart(cart, session);
    const subtotal = round2(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

    let discount = 0;
    let couponId;
    let couponCode;

    if (payload.couponCode) {
      const couponResult = await couponService.validateCouponForCart({
        code: payload.couponCode,
        cartItems: orderItems,
        userId,
      });
      discount = couponResult.discount;
      couponId = couponResult.coupon._id;
      couponCode = couponResult.coupon.code;
    }

    // Free shipping is earned on what the customer actually pays for goods, so a
    // large coupon cannot buy free delivery on a small order.
    const taxable = round2(Math.max(0, subtotal - discount));
    const deliveryFee = deliveryService.calculateDeliveryFee({
      deliveryType: payload.deliveryType,
      subtotal: taxable,
    });

    // Tax applies to the discounted goods value, not to delivery.
    const tax = round2(taxable * TAX_RATE);
    const totalAmount = round2(taxable + deliveryFee + tax);

    for (const item of orderItems) {
      await inventoryService.reserveStock({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        session,
      });
    }

    const [order] = await Order.create(
      [
        {
          userId,
          items: orderItems,
          shippingAddress: {
            fullName: address.fullName,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            country: address.country,
            postalCode: address.postalCode,
            addressType: address.addressType,
          },
          subtotal,
          discount,
          deliveryFee,
          tax,
          totalAmount,
          couponId,
          couponCode,
          orderNumber: await nextOrderNumber(session),
          paymentStatus: PAYMENT_STATUS.PENDING,
          orderStatus: ORDER_STATUS.PLACED,
          statusHistory: [{ status: ORDER_STATUS.PLACED, at: new Date(), by: userId }],
          deliveryDate: payload.deliveryDate,
          deliverySlot: payload.deliverySlot,
          deliveryType: payload.deliveryType,
          idempotencyKey,
          reservationExpiresAt: reservationService.getReservationExpiry(),
        },
      ],
      { session }
    );

    if (couponId) {
      await couponService.incrementCouponUsage(couponId, session);
      await couponService.recordRedemption({ couponId, userId, orderId: order._id }, session);
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save({ session });

    await session.commitTransaction();

    const paymentService = require('./payment.service');
    const paymentInfo = await paymentService.createPaymentOrder({
      order,
      userId,
    });

    return {
      order,
      payment: paymentInfo,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getUserOrders = async (userId, query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const skip = (page - 1) * limit;

  const filter = { userId };
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
  ]);

  return {
    items: orders,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const getOrderById = async (userId, orderId, { isAdmin = false } = {}) => {
  const filter = isAdmin ? { _id: orderId } : { _id: orderId, userId };
  const order = await Order.findOne(filter);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }
  return order;
};

const cancelOrder = async (userId, orderId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderId, userId }).session(session);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const cancellable = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
    if (!cancellable.includes(ORDER_STATUS.CANCELLED)) {
      const error = new Error('Order cannot be cancelled at this stage');
      error.statusCode = 400;
      throw error;
    }

    const wasPaid = order.paymentStatus === PAYMENT_STATUS.PAID;
    await applyCancellation(order, session, { by: userId, note: 'Cancelled by customer' });
    await order.save({ session });
    await session.commitTransaction();

    if (wasPaid) {
      await refundAfterCommit(order._id);
    }
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const markOrderPaid = async (orderId, session) => {
  const order = await Order.findById(orderId).session(session);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (order.paymentStatus === PAYMENT_STATUS.PAID) {
    return order;
  }

  for (const item of order.items) {
    await inventoryService.reduceStock({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      session,
    });
  }

  order.reservationExpiresAt = undefined;
  order.paymentStatus = PAYMENT_STATUS.PAID;
  recordStatus(order, ORDER_STATUS.PAYMENT_CONFIRMED, { note: 'Payment captured' });
  await order.save({ session });
  return order;
};

const updateOrderStatus = async (orderId, status, { adminId, note } = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }

    const allowed = ORDER_STATUS_TRANSITIONS[order.orderStatus] || [];
    if (!allowed.includes(status)) {
      const error = new Error(`Cannot move an order from ${order.orderStatus} to ${status}`);
      error.statusCode = 400;
      throw error;
    }

    const actor = { by: adminId, note };
    const wasPaid = order.paymentStatus === PAYMENT_STATUS.PAID;
    const cancelling = status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED;

    if (cancelling) {
      await applyCancellation(order, session, actor);
    } else {
      recordStatus(order, status, actor);
    }

    await order.save({ session });
    await session.commitTransaction();

    if (cancelling && wasPaid) {
      await refundAfterCommit(order._id);
    }
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  createOrderFromCart,
  updateOrderStatus,
  getUserOrders,
  getOrderById,
  cancelOrder,
  markOrderPaid,
};
