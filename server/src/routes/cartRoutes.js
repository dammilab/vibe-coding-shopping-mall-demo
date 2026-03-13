const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const {
  getMyCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");

// 모든 장바구니 관련 라우트는 로그인 필요
router.use(authenticate);

// GET    /api/cart        - 내 장바구니 조회 (READ)
router.get("/", getMyCart);

// POST   /api/cart        - 장바구니에 아이템 추가 / 수량 증가 (CREATE/UPSERT)
router.post("/", addItemToCart);

// PUT    /api/cart/:itemId    - 특정 장바구니 아이템 수정 (UPDATE)
router.put("/:itemId", updateCartItem);

// DELETE /api/cart/:itemId    - 특정 장바구니 아이템 삭제 (DELETE)
router.delete("/:itemId", removeCartItem);

// DELETE /api/cart        - 장바구니 전체 비우기 (DELETE ALL)
router.delete("/", clearCart);

module.exports = router;

