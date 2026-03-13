const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  getMyCart,
  addToCart,
} = require("../controllers/userController");

// GET    /api/users      - 전체 유저 목록 조회
router.get("/", getUsers);

// GET    /api/users/me/wishlist - 내 위시리스트 조회
router.get("/me/wishlist", authenticate, getMyWishlist);

// POST   /api/users/me/wishlist - 내 위시리스트 추가
router.post("/me/wishlist", authenticate, addToWishlist);

// DELETE /api/users/me/wishlist/:productId - 내 위시리스트 제거
router.delete("/me/wishlist/:productId", authenticate, removeFromWishlist);

// GET    /api/users/me/cart - 내 장바구니 조회
router.get("/me/cart", authenticate, getMyCart);

// POST   /api/users/me/cart - 내 장바구니 추가
router.post("/me/cart", authenticate, addToCart);

// GET    /api/users/:id  - 특정 유저 조회 (id로 검색)
router.get("/:id", getUserById);

// POST   /api/users      - 새 유저 생성
router.post("/", createUser);

// PUT    /api/users/:id  - 특정 유저 정보 수정
router.put("/:id", updateUser);

// DELETE /api/users/:id  - 특정 유저 삭제
router.delete("/:id", deleteUser);

module.exports = router;
