import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import orderService from '../src/services/order.service.js';
import cartService from '../src/services/cart.service.js';
import couponService from '../src/services/coupon.service.js';
import reservationService from '../src/services/reservation.service.js';
import Order from '../src/models/Order.js';
import Cart from '../src/models/Cart.js';
import Product from '../src/models/Product.js';
import Coupon from '../src/models/Coupon.js';
import { createAddress, createProduct, registerUser } from './factories.js';

const setupCheckout = async ({ stock = 10, price = 500, quantity = 2 } = {}) => {
  const { agent, user } = await registerUser();
  const address = await createAddress(agent);
  const product = await createProduct({ price, inventory: { sku: 'CK', stock } });
  await cartService.addCartItem(user._id, { productId: product._id.toString(), quantity });
  return { user, address, product };
};

const markPaid = async (orderId) => {
  const session = await mongoose.startSession();
  await session.withTransaction(() => orderService.markOrderPaid(orderId, session));
  await session.endSession();
};

describe('checkout', () => {
  it('creates an order, reserves stock and empties the cart', async () => {
    const { user, address, product } = await setupCheckout();

    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    expect(order.orderNumber).toMatch(/^DRL-\d{6}$/);
    expect(order.subtotal).toBe(1000);
    expect(order.deliveryFee).toBe(99);
    expect(order.tax).toBe(180);
    expect(order.totalAmount).toBe(1279);
    expect(order.statusHistory.map((entry) => entry.status)).toEqual(['PLACED']);
    expect(order.reservationExpiresAt).toBeInstanceOf(Date);

    expect((await Product.findById(product._id)).inventory.reservedStock).toBe(2);
    expect((await Cart.findOne({ userId: user._id })).items).toHaveLength(0);
  });

  it('replays the same order for a repeated idempotency key', async () => {
    const { user, address, product } = await setupCheckout();

    const first = await orderService.createOrderFromCart(user._id, { addressId: address._id }, 'key-1');
    const second = await orderService.createOrderFromCart(user._id, { addressId: address._id }, 'key-1');

    expect(second.order._id.toString()).toBe(first.order._id.toString());
    expect(second.replayed).toBe(true);
    expect(await Order.countDocuments({ userId: user._id })).toBe(1);
    expect((await Product.findById(product._id)).inventory.reservedStock).toBe(2);
  });

  it('releases the reservation when a customer cancels', async () => {
    const { user, address, product } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    const cancelled = await orderService.cancelOrder(user._id, order._id);

    expect(cancelled.orderStatus).toBe('CANCELLED');
    expect(cancelled.reservationExpiresAt).toBeUndefined();
    const saved = await Product.findById(product._id);
    expect(saved.inventory.reservedStock).toBe(0);
    expect(saved.inventory.stock).toBe(10);
  });

  it('rejects cancellation when the order has personalised items', async () => {
    const { agent, user } = await registerUser();
    const address = await createAddress(agent);
    const product = await createProduct({
      customizationFields: [{ name: 'Note', type: 'TEXT', required: true }],
    });
    await cartService.addCartItem(user._id, {
      productId: product._id.toString(),
      quantity: 1,
      customization: [{ name: 'Note', type: 'TEXT', value: 'Hello' }],
    });
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    await expect(orderService.cancelOrder(user._id, order._id)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('blocks admin refund when the order has personalised items', async () => {
    const { agent, user } = await registerUser();
    const address = await createAddress(agent);
    const product = await createProduct({
      customizationFields: [{ name: 'Note', type: 'TEXT', required: true }],
    });
    await cartService.addCartItem(user._id, {
      productId: product._id.toString(),
      quantity: 1,
      customization: [{ name: 'Note', type: 'TEXT', value: 'Hello' }],
    });
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });
    await markPaid(order._id);

    await expect(
      orderService.updateOrderStatus(order._id, 'REFUNDED', { note: 'Customer request' })
    ).rejects.toMatchObject({ statusCode: 400 });

    const saved = await Order.findById(order._id);
    expect(saved.orderStatus).toBe('PAYMENT_CONFIRMED');
    expect(saved.paymentStatus).toBe('PAID');
  });

  it('refunds and restores stock when a paid order is cancelled', async () => {
    const { user, address, product } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });
    await markPaid(order._id);

    expect((await Product.findById(product._id)).inventory.stock).toBe(8);

    const cancelled = await orderService.cancelOrder(user._id, order._id);

    expect(cancelled.orderStatus).toBe('REFUNDED');
    expect(cancelled.paymentStatus).toBe('REFUNDED');
    expect((await Product.findById(product._id)).inventory.stock).toBe(10);
  });
});

describe('reservation sweep', () => {
  it('frees stock held by an order that was never paid', async () => {
    const { user, address, product } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    await Order.updateOne({ _id: order._id }, { reservationExpiresAt: new Date(Date.now() - 1000) });
    expect(await reservationService.releaseExpiredReservations()).toBe(1);

    const swept = await Order.findById(order._id);
    expect(swept.orderStatus).toBe('FAILED');
    expect(swept.paymentStatus).toBe('FAILED');
    expect((await Product.findById(product._id)).inventory.reservedStock).toBe(0);
  });

  it('leaves a paid order alone', async () => {
    const { user, address } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });
    await markPaid(order._id);

    await Order.updateOne({ _id: order._id }, { reservationExpiresAt: new Date(Date.now() - 1000) });
    expect(await reservationService.releaseExpiredReservations()).toBe(0);
    expect((await Order.findById(order._id)).orderStatus).toBe('PAYMENT_CONFIRMED');
  });
});

describe('order status transitions', () => {
  it('rejects a jump that skips the payment step', async () => {
    const { user, address } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    await expect(orderService.updateOrderStatus(order._id, 'DELIVERED')).rejects.toThrow(
      'Cannot move an order from PLACED to DELIVERED'
    );
  });

  it('runs the cancellation side effects when an admin cancels', async () => {
    const { user, address, product } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });
    await markPaid(order._id);

    const updated = await orderService.updateOrderStatus(order._id, 'REFUNDED', { note: 'Damaged' });

    expect(updated.paymentStatus).toBe('REFUNDED');
    expect((await Product.findById(product._id)).inventory.stock).toBe(10);
    expect(updated.statusHistory.at(-1).note).toBe('Damaged');
  });

  it('records every transition in order', async () => {
    const { user, address } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });
    await markPaid(order._id);
    await orderService.updateOrderStatus(order._id, 'PROCESSING');
    const shipped = await orderService.updateOrderStatus(order._id, 'READY_TO_SHIP');

    expect(shipped.statusHistory.map((entry) => entry.status)).toEqual([
      'PLACED',
      'PAYMENT_CONFIRMED',
      'PROCESSING',
      'READY_TO_SHIP',
    ]);
  });
});

describe('coupons', () => {
  it('refuses to increment past the usage limit', async () => {
    const coupon = await Coupon.create({
      code: 'LIMITED',
      discountType: 'FLAT',
      discountValue: 50,
      startDate: new Date(Date.now() - 1000),
      expiryDate: new Date(Date.now() + 86400000),
      usageLimit: 1,
    });

    await couponService.incrementCouponUsage(coupon._id);
    await expect(couponService.incrementCouponUsage(coupon._id)).rejects.toThrow(
      'Coupon usage limit reached'
    );
    expect((await Coupon.findById(coupon._id)).usedCount).toBe(1);
  });

  it('discounts only the items the coupon is scoped to', async () => {
    const { user, address } = await setupCheckout({ price: 500, quantity: 2 });
    const other = await createProduct({ price: 1000, inventory: { sku: 'OTHER', stock: 5 } });
    await cartService.addCartItem(user._id, { productId: other._id.toString(), quantity: 1 });

    const cart = await Cart.findOne({ userId: user._id });
    await Coupon.create({
      code: 'SCOPED',
      discountType: 'PERCENTAGE',
      discountValue: 50,
      startDate: new Date(Date.now() - 1000),
      expiryDate: new Date(Date.now() + 86400000),
      applicableProducts: [cart.items[0].productId],
    });

    const { order } = await orderService.createOrderFromCart(user._id, {
      addressId: address._id,
      couponCode: 'SCOPED',
    });

    // 50% of the 1000 eligible subtotal, not of the 2000 cart total
    expect(order.subtotal).toBe(2000);
    expect(order.discount).toBe(500);
  });
});

describe('per-user coupon redemption', () => {
  const makeCoupon = () =>
    Coupon.create({
      code: 'ONCE',
      discountType: 'FLAT',
      discountValue: 100,
      startDate: new Date(Date.now() - 1000),
      expiryDate: new Date(Date.now() + 86400000),
    });

  it('blocks the same customer from reusing a coupon', async () => {
    await makeCoupon();
    const { user, address, product } = await setupCheckout();
    await orderService.createOrderFromCart(user._id, { addressId: address._id, couponCode: 'ONCE' });

    await cartService.addCartItem(user._id, { productId: product._id.toString(), quantity: 1 });
    await expect(
      orderService.createOrderFromCart(user._id, { addressId: address._id, couponCode: 'ONCE' })
    ).rejects.toThrow('You have already used this coupon');
  });

  it('gives the coupon back when the order is cancelled', async () => {
    const coupon = await makeCoupon();
    const { user, address, product } = await setupCheckout();
    const { order } = await orderService.createOrderFromCart(user._id, {
      addressId: address._id,
      couponCode: 'ONCE',
    });
    expect((await Coupon.findById(coupon._id)).usedCount).toBe(1);

    await orderService.cancelOrder(user._id, order._id);
    expect((await Coupon.findById(coupon._id)).usedCount).toBe(0);

    await cartService.addCartItem(user._id, { productId: product._id.toString(), quantity: 1 });
    const retry = await orderService.createOrderFromCart(user._id, {
      addressId: address._id,
      couponCode: 'ONCE',
    });
    expect(retry.order.discount).toBe(100);
  });
});

describe('order pricing', () => {
  it('taxes the discounted goods value and waives delivery over the threshold', async () => {
    const { user, address } = await setupCheckout({ price: 800, quantity: 2 });
    await Coupon.create({
      code: 'TENOFF',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: new Date(Date.now() - 1000),
      expiryDate: new Date(Date.now() + 86400000),
    });

    const { order } = await orderService.createOrderFromCart(user._id, {
      addressId: address._id,
      couponCode: 'TENOFF',
    });

    // 1600 goods − 160 coupon = 1440 taxable; under ₹1,499 so delivery still applies.
    expect(order.subtotal).toBe(1600);
    expect(order.discount).toBe(160);
    expect(order.deliveryFee).toBe(99);
    expect(order.tax).toBe(259.2);
    expect(order.totalAmount).toBe(1798.2);
  });

  it('waives delivery once the subtotal clears the free-shipping threshold', async () => {
    const { user, address } = await setupCheckout({ price: 1500, quantity: 1 });
    const { order } = await orderService.createOrderFromCart(user._id, { addressId: address._id });

    expect(order.deliveryFee).toBe(0);
    expect(order.totalAmount).toBe(1770);
  });

  it('charges express more than standard', async () => {
    const a = await setupCheckout({ price: 200, quantity: 1 });
    const standard = await orderService.createOrderFromCart(a.user._id, { addressId: a.address._id });
    const b = await setupCheckout({ price: 200, quantity: 1 });
    const express = await orderService.createOrderFromCart(b.user._id, {
      addressId: b.address._id,
      deliveryType: 'EXPRESS',
    });

    expect(standard.order.deliveryFee).toBe(99);
    expect(express.order.deliveryFee).toBe(199);
  });
});
