const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

// GET    /api/products          - 전체 상품 조회 (?category=상의 필터 가능)
router.get("/", getProducts);

// GET    /api/products/:id      - 특정 상품 조회
router.get("/:id", getProductById);

// POST   /api/products          - 상품 생성
router.post("/", createProduct);

// PUT    /api/products/:id      - 상품 수정
router.put("/:id", updateProduct);

// DELETE /api/products/:id      - 상품 삭제
router.delete("/:id", deleteProduct);

module.exports = router;
