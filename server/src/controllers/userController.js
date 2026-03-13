const bcrypt = require("bcrypt");
const User = require("../models/User");
const Product = require("../models/Product");

const SALT_ROUNDS = 10;

// 전체 유저 목록 조회
// 응답에서 password 필드는 제외
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// 특정 유저 조회 (URL 파라미터 id 사용)
// 응답에서 password 필드는 제외
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// 새 유저 생성
// 이메일 중복 시 400 에러 반환
const createUser = async (req, res, next) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    // 이메일 중복 체크
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({ email, name, password: hashedPassword, user_type, address });

    // 응답에서 password 제거 후 반환
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

// 특정 유저 정보 수정
// 전달된 필드만 업데이트 (부분 수정 가능)
const updateUser = async (req, res, next) => {
  try {
    const { email, name, password, user_type, address } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // undefined가 아닌 필드만 업데이트
    if (email !== undefined) user.email = email;
    if (name !== undefined) user.name = name;
    if (password !== undefined) user.password = await bcrypt.hash(password, SALT_ROUNDS);
    if (user_type !== undefined) user.user_type = user_type;
    if (address !== undefined) user.address = address;

    await user.save();

    // 응답에서 password 제거 후 반환
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

// 특정 유저 삭제
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

// 내 위시리스트 조회
const getMyWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("wishlist");
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }
    return res.json({ success: true, data: user.wishlist || [] });
  } catch (error) {
    return next(error);
  }
};

// 위시리스트 추가
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId가 필요합니다." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    const exists = user.wishlist.some((id) => id.toString() === productId);
    if (!exists) {
      user.wishlist.push(productId);
      await user.save();
    }

    return res.json({ success: true, message: "위시리스트에 추가되었습니다.", data: user.wishlist });
  } catch (error) {
    return next(error);
  }
};

// 위시리스트 제거
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    await user.save();
    return res.json({ success: true, message: "위시리스트에서 제거되었습니다.", data: user.wishlist });
  } catch (error) {
    return next(error);
  }
};

// 내 장바구니 조회
const getMyCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("cart.product");
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }
    return res.json({ success: true, data: user.cart || [] });
  } catch (error) {
    return next(error);
  }
};

// 장바구니 추가
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, size = "", color = "" } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, message: "productId가 필요합니다." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    const safeQuantity = Math.max(1, Number(quantity) || 1);
    const targetIdx = user.cart.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    if (targetIdx >= 0) {
      user.cart[targetIdx].quantity += safeQuantity;
    } else {
      user.cart.push({
        product: productId,
        quantity: safeQuantity,
        size,
        color,
      });
    }

    await user.save();
    return res.json({ success: true, message: "장바구니에 담았습니다.", data: user.cart });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
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
};
