const express = require("express");
const router = express.Router();
const { login, getMe } = require("../controllers/authController");
const authenticate = require("../middleware/auth");

// POST /api/auth/login - 로그인
router.post("/login", login);

// GET  /api/auth/me    - 토큰으로 현재 유저 정보 조회
router.get("/me", authenticate, getMe);

module.exports = router;
