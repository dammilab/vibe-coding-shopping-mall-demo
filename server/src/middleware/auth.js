const jwt = require("jsonwebtoken");

// JWT 토큰 검증 미들웨어
// Authorization 헤더에서 "Bearer <token>" 형식으로 토큰을 추출하여 검증
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "토큰이 없습니다." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // 토큰 검증 후 디코딩된 유저 정보를 req.user에 저장
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "유효하지 않은 토큰입니다." });
  }
};

module.exports = authenticate;
