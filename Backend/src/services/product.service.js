const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { slugify, pickDefined } = require('../utils/helpers');
const { uploadBufferToCloudinary, deleteCloudinaryAsset } = require('../utils/upload');
const { CUSTOMIZATION_FIELD_TYPES, TAXONOMY_KINDS } = require('../utils/constants');

const getUnitPrice = (product, variant) => {
  if (variant && variant.price != null) {
    return variant.price;
  }
  if (product.discountPrice != null) {
    return product.discountPrice;
  }
  return product.price;
};

const validateCustomizationInput = (product, customization = []) => {
  const fields = product.customizationFields || [];
  const providedMap = new Map(customization.map((item) => [item.name, item]));

  for (const field of fields) {
    const provided = providedMap.get(field.name);
    if (field.required && (!provided || (!provided.value && !provided.imageUrl))) {
      const error = new Error(`Customization field "${field.name}" is required`);
      error.statusCode = 400;
      throw error;
    }

    if (provided && field.type === CUSTOMIZATION_FIELD_TYPES.SELECT && field.options?.length) {
      if (!field.options.includes(provided.value)) {
        const error = new Error(`Invalid option for "${field.name}"`);
        error.statusCode = 400;
        throw error;
      }
    }
  }
};

// Filters accept either an ObjectId or a slug, so the client can filter straight
// from the URL without first fetching the taxonomy to translate slugs into ids.
const resolveTaxonomyId = async (value, kind) => {
  if (!value) {
    return undefined;
  }
  if (mongoose.isValidObjectId(value)) {
    return value;
  }
  const match = await Category.findOne({ slug: String(value).toLowerCase(), kind }).select('_id');
  return match?._id || null;
};

const NO_MATCH = new mongoose.Types.ObjectId('000000000000000000000000');

const buildProductListQuery = async (query) => {
  const filter = { isActive: true };
  const options = {
    page: Math.max(1, Number(query.page) || 1),
    limit: Math.min(100, Math.max(1, Number(query.limit) || 20)),
    sort: { createdAt: -1 },
  };

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  const [categoryId, subCategoryId, occasionId] = await Promise.all([
    resolveTaxonomyId(query.category, TAXONOMY_KINDS.CATEGORY),
    resolveTaxonomyId(query.subCategory, TAXONOMY_KINDS.CATEGORY),
    resolveTaxonomyId(query.occasion, TAXONOMY_KINDS.OCCASION),
  ]);

  if (subCategoryId !== undefined) {
    filter.subCategory = subCategoryId || NO_MATCH;
  } else if (categoryId !== undefined) {
    // A parent category also matches products filed only under one of its children.
    const childIds = categoryId ? await Category.find({ parentCategory: categoryId }).distinct('_id') : [];
    filter.$or = [{ category: categoryId || NO_MATCH }, { subCategory: { $in: childIds } }];
  }

  if (occasionId !== undefined) {
    filter.occasions = occasionId || NO_MATCH;
  }

  if (query.personalised === 'true' || query.personalised === true) {
    filter['customizationFields.0'] = { $exists: true };
  }

  if (query.onSale === 'true' || query.onSale === true) {
    filter.discountPrice = { $ne: null };
    filter.$expr = { $lt: ['$discountPrice', '$price'] };
  }

  if (query.tags) {
    const tags = String(query.tags).split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
    if (tags.length) {
      filter.tags = { $in: tags };
    }
  }

  if (query.minPrice || query.maxPrice) {
    filter.effectivePrice = {};
    if (query.minPrice) filter.effectivePrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.effectivePrice.$lte = Number(query.maxPrice);
  }

  if (query.rating) {
    filter.rating = { $gte: Number(query.rating) };
  }

  if (query.featured === 'true') {
    filter.isFeatured = true;
  }

  switch (query.sort) {
    case 'price_asc':
      options.sort = { effectivePrice: 1 };
      break;
    case 'price_desc':
      options.sort = { effectivePrice: -1 };
      break;
    case 'rating_desc':
      options.sort = { rating: -1 };
      break;
    case 'newest':
      options.sort = { createdAt: -1 };
      break;
    default:
      break;
  }

  return { filter, options };
};

const listProducts = async (query) => {
  const { filter, options } = await buildProductListQuery(query);
  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .populate('occasions', 'name slug')
      .sort(options.sort)
      .skip(skip)
      .limit(options.limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit) || 1,
    },
  };
};

const listAdminProducts = async (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  const filter = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }
  if (query.category) {
    filter.category = query.category;
  }
  if (query.isActive === 'true') filter.isActive = true;
  if (query.isActive === 'false') filter.isActive = false;

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

const getProductById = async (id) => {
  const product = await Product.findOne({ _id: id, isActive: true })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('occasions', 'name slug');

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('occasions', 'name slug');

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  return product;
};

const getFeaturedProducts = async (limit = 12) =>
  Product.find({ isActive: true, isFeatured: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('occasions', 'name slug');

const getProductsByCategory = async (categoryId, query) =>
  listProducts({ ...query, category: categoryId });

const ensureUniqueSlug = async (name, excludeId) => {
  const base = slugify(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await Product.findOne({
      slug,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (!existing) {
      return slug;
    }
    slug = `${base}-${counter}`;
    counter += 1;
  }
};

const rollbackUploadedImages = async (images = []) => {
  for (const image of images) {
    if (image?.publicId) {
      await deleteCloudinaryAsset(image.publicId).catch(() => {});
    }
  }
};

const uploadImages = async (files = []) => {
  const uploads = [];
  try {
    for (const file of files) {
      const uploaded = await uploadBufferToCloudinary(file.buffer, 'dearlys/products');
      uploads.push({ url: uploaded.url, publicId: uploaded.publicId, alt: file.originalname });
    }
    return uploads;
  } catch (error) {
    await rollbackUploadedImages(uploads);
    throw error;
  }
};

const createProduct = async (payload, files = []) => {
  const payloadImages = Array.isArray(payload.images) ? payload.images : [];
  let uploadedImages = [];
  try {
    const category = await Category.findById(payload.category);
    if (!category || !category.isActive) {
      const error = new Error('Invalid category');
      error.statusCode = 400;
      throw error;
    }

    if (payload.subCategory) {
      const subCategory = await Category.findById(payload.subCategory);
      if (!subCategory || !subCategory.isActive) {
        const error = new Error('Invalid subcategory');
        error.statusCode = 400;
        throw error;
      }
    }

    const slug = payload.slug ? slugify(payload.slug) : await ensureUniqueSlug(payload.name);
    uploadedImages = await uploadImages(files);
    const images = uploadedImages.length ? uploadedImages : payloadImages;

    const product = await Product.create({
      ...payload,
      slug,
      images,
    });

    return product;
  } catch (error) {
    await rollbackUploadedImages(uploadedImages);
    await rollbackUploadedImages(payloadImages);
    throw error;
  }
};

// reservedStock and variant _ids are server-owned: a payload that omits them must
// not free held stock or orphan the variantId stored on carts and orders.
const mergeVariants = (existing = [], incoming = []) => {
  const byId = new Map(existing.map((variant) => [variant._id.toString(), variant.toObject()]));
  return incoming.map((variant) => {
    const previous = variant._id ? byId.get(variant._id.toString()) : null;
    return previous ? { ...previous, ...variant, _id: previous._id } : variant;
  });
};

const updateProduct = async (id, payload, files = []) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  const updates = pickDefined(payload);
  if (updates.name && !updates.slug) {
    updates.slug = await ensureUniqueSlug(updates.name, id);
  } else if (updates.slug) {
    updates.slug = slugify(updates.slug);
  }

  if (files.length) {
    const uploaded = await uploadImages(files);
    updates.images = [...(product.images || []), ...uploaded];
  }

  if (updates.variants) {
    updates.variants = mergeVariants(product.variants, updates.variants);
  }

  if (updates.inventory) {
    updates.inventory = {
      ...(product.inventory?.toObject?.() || {}),
      ...updates.inventory,
      reservedStock: product.inventory?.reservedStock ?? 0,
    };
  }

  Object.assign(product, updates);
  await product.save();
  return product;
};

const softDeleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  product.isActive = false;
  await product.save();
  return product;
};

const recalculateProductRating = async (productId) => {
  const Review = require('../models/Review');
  const stats = await Review.aggregate([
    { $match: { productId: productId, isApproved: true } },
    {
      $group: {
        _id: '$productId',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const rating = stats[0]?.avgRating ? Number(stats[0].avgRating.toFixed(2)) : 0;
  const reviewCount = stats[0]?.count || 0;

  await Product.findByIdAndUpdate(productId, { rating, reviewCount });
  return { rating, reviewCount };
};

module.exports = {
  listProducts,
  listAdminProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  getProductsByCategory,
  createProduct,
  updateProduct,
  softDeleteProduct,
  getUnitPrice,
  validateCustomizationInput,
  recalculateProductRating,
  deleteCloudinaryAsset,
};
