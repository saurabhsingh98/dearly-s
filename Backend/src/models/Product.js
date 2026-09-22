const mongoose = require('mongoose');
const { CUSTOMIZATION_FIELD_TYPES } = require('../utils/constants');
const { money, moneyJson, toNumber } = require('../utils/money');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, trim: true },
  },
  { _id: false }
);

const customizationFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(CUSTOMIZATION_FIELD_TYPES),
      required: true,
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String, trim: true },
    options: [{ type: String, trim: true }],
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    attributes: {
      size: { type: String, trim: true },
      color: { type: String, trim: true },
      material: { type: String, trim: true },
    },
    sku: { type: String, trim: true, index: true },
    swatch: { type: String, trim: true },
    priceDelta: money({ default: 0 }),
    price: money(),
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    dimensions: {
      lengthCm: { type: Number, min: 0 },
      breadthCm: { type: Number, min: 0 },
      heightCm: { type: Number, min: 0 },
    },
    images: [imageSchema],
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    shortDescription: { type: String, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      index: true,
    },
    images: [imageSchema],
    price: money({ required: true }),
    discountPrice: money(),
    // What the customer actually pays; list filters and sorts read this.
    effectivePrice: money({ default: 0 }),
    variants: [variantSchema],
    customizationFields: [customizationFieldSchema],
    inventory: {
      sku: { type: String, trim: true },
      stock: { type: Number, default: 0, min: 0 },
      reservedStock: { type: Number, default: 0, min: 0 },
    },
    occasions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    tags: [{ type: String, trim: true, lowercase: true }],
    badge: { type: String, trim: true },
    deliveryEta: { type: String, trim: true },
    highlights: [{ type: String, trim: true }],
    specs: [
      {
        _id: false,
        label: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    art: {
      _id: false,
      from: { type: String, trim: true },
      to: { type: String, trim: true },
      motif: { type: String, trim: true },
      pattern: { type: String, trim: true },
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, ...moneyJson }
);

const effectivePriceOf = ({ price, discountPrice }) => {
  const list = toNumber(price) ?? 0;
  const sale = toNumber(discountPrice);
  return sale != null && sale > 0 && sale < list ? sale : list;
};

productSchema.pre('save', function syncEffectivePrice() {
  this.effectivePrice = effectivePriceOf(this);
});

// findOneAndUpdate bypasses the save hook, and an update may change only one of
// the two prices, so the current values have to be merged in.
productSchema.pre(['findOneAndUpdate', 'updateOne'], async function syncEffectivePrice() {
  const update = this.getUpdate() || {};
  const target = update.$set || update;
  if (target.price === undefined && target.discountPrice === undefined) {
    return;
  }

  const current = await this.model
    .findOne(this.getQuery())
    .select('price discountPrice')
    .lean();

  target.effectivePrice = effectivePriceOf({
    price: target.price !== undefined ? target.price : current?.price,
    discountPrice:
      target.discountPrice !== undefined ? target.discountPrice : current?.discountPrice,
  });
});

productSchema.index({ name: 'text', tags: 'text', shortDescription: 'text' });
productSchema.index({ isActive: 1, effectivePrice: 1 });
productSchema.index({ isActive: 1, category: 1, price: 1 });
productSchema.index({ isActive: 1, occasions: 1 });
productSchema.index({ isActive: 1, isFeatured: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema);
module.exports.effectivePriceOf = effectivePriceOf;
