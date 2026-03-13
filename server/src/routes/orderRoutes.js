const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth");
const {
  createOrder,
  confirmPayment,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  cancelOrder,
} = require("../controllers/orderController");

// 모든 주문 관련 라우트는 로그인 필요
router.use(authenticate);

// 관리자 권한 체크 미들웨어
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.user_type === "admin") {
    return next();
  }
  return res.status(403).json({ success: false, message: "관리자 권한이 필요합니다." });
};

// GET    /api/orders          - 전체 주문 목록 (관리용, 관리자 전용)
router.get("/", requireAdmin, getOrders);

// GET    /api/orders/my       - 내 주문 목록 조회
router.get("/my", getMyOrders);

// GET    /api/orders/:id      - 특정 주문 상세 (본인 주문 또는 관리자)
router.get("/:id", getOrderById);

// POST   /api/orders          - 주문 생성 (장바구니 기반, 생성 후 장바구니 자동 비움)
router.post("/", createOrder);

// POST   /api/orders/:id/confirm - 포트원 결제 검증 및 주문 확정
router.post("/:id/confirm", confirmPayment);

// POST   /api/orders/:id/cancel - 주문 취소 (본인 주문 또는 관리자)
router.post("/:id/cancel", cancelOrder);

// PUT    /api/orders/:id      - 주문 업데이트 (관리용 단순 CRUD, 관리자 전용)
router.put("/:id", requireAdmin, updateOrder);

// DELETE /api/orders/:id      - 주문 삭제 (관련 데이터 포함, 관리자 전용)
router.delete("/:id", requireAdmin, deleteOrder);

module.exports = router;



