const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 로그인
// 이메일로 유저를 찾고, bcrypt로 비밀번호 일치 여부 확인 후 JWT 토큰 발급
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "이메일과 비밀번호를 입력해주세요." });
    }

    // 이메일로 유저 조회 (password 포함해서 가져옴)
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // 암호화된 비밀번호와 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // JWT 토큰 발급 (유저 id, email, user_type을 payload에 포함, 24시간 유효)
    const token = jwt.sign(
      { id: user._id, email: user.email, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 응답에서 password 제거 후 반환
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, message: "로그인 성공", token, data: userResponse });
  } catch (error) {
    next(error);
  }
};

// 토큰으로 현재 로그인된 유저 정보 조회
const getMe = async (req, res, next) => {
  try {
    // req.user는 auth 미들웨어에서 토큰을 디코딩하여 넣어준 값
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe };
