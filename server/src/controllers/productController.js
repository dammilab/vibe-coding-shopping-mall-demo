const Product = require("../models/Product");

// 전체 상품 목록 조회
// 쿼리 파라미터:
// - category: 카테고리 필터 (예: ?category=상의)
// - page: 페이지 번호 (기본값 1)
// 한 페이지에 4개씩 반환 (limit = 4)
const getProducts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 특정 상품 조회 (id)
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 상품 생성
// SKU 중복 시 400 에러 반환
const createProduct = async (req, res, next) => {
  try {
    const { sku, name, price, category, image, description } = req.body;

    // SKU 중복 체크
    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(400).json({ success: false, message: "이미 존재하는 SKU입니다." });
    }

    const product = await Product.create({ sku, name, price, category, image, description });
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 상품 수정
// 전달된 필드만 업데이트
const updateProduct = async (req, res, next) => {
  try {
    const { sku, name, price, category, image, description } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    // SKU 변경 시 중복 체크
    if (sku !== undefined && sku !== product.sku) {
      const existing = await Product.findOne({ sku });
      if (existing) {
        return res.status(400).json({ success: false, message: "이미 존재하는 SKU입니다." });
      }
      product.sku = sku;
    }

    if (name !== undefined) product.name = name;
    if (price !== undefined) product.price = price;
    if (category !== undefined) product.category = category;
    if (image !== undefined) product.image = image;
    if (description !== undefined) product.description = description;

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

// 상품 삭제
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }
    res.json({ success: true, message: "상품이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProducts, getProductById, createProduct, updateProduct, deleteProduct };
