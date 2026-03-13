const Cart = require("../models/Cart");
const Product = require("../models/Product");

// 현재 로그인한 유저의 장바구니 가져오기 (READ)
const getMyCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart) {
      return res.json({
        success: true,
        data: {
          items: [],
          totalQuantity: 0,
          totalAmount: 0,
        },
      });
    }

    return res.json({
      success: true,
      data: {
        items: cart.items,
        totalQuantity: cart.totalQuantity,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 장바구니에 상품 추가 또는 수량 증가 (CREATE / UPSERT)
const addItemToCart = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1, size = "", color = "" } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: "productId가 필요합니다." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    const safeQty = Math.max(1, Number(quantity) || 1);

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [{ product: productId, quantity: safeQty, size, color }],
      });
    } else {
      const targetIdx = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          item.size === size &&
          item.color === color
      );

      if (targetIdx >= 0) {
        cart.items[targetIdx].quantity += safeQty;
      } else {
        cart.items.push({ product: productId, quantity: safeQty, size, color });
      }

      await cart.save();
    }

    await cart.populate("items.product");

    return res.status(201).json({
      success: true,
      message: "장바구니에 담았습니다.",
      data: {
        items: cart.items,
        totalQuantity: cart.totalQuantity,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 장바구니 아이템 수정 (UPDATE)
// URL의 itemId를 사용해 해당 항목의 수량/옵션 변경
const updateCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity, size, color } = req.body;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "장바구니가 비어 있습니다." });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "해당 장바구니 아이템을 찾을 수 없습니다." });
    }

    if (quantity !== undefined) {
      const safeQty = Math.max(1, Number(quantity) || 1);
      item.quantity = safeQty;
    }
    if (size !== undefined) item.size = size;
    if (color !== undefined) item.color = color;

    await cart.save();
    await cart.populate("items.product");

    return res.json({
      success: true,
      message: "장바구니 아이템이 수정되었습니다.",
      data: {
        items: cart.items,
        totalQuantity: cart.totalQuantity,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 장바구니 아이템 삭제 (DELETE)
const removeCartItem = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "장바구니가 비어 있습니다." });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: "해당 장바구니 아이템을 찾을 수 없습니다." });
    }

    item.deleteOne();
    await cart.save();
    await cart.populate("items.product");

    return res.json({
      success: true,
      message: "장바구니 아이템이 삭제되었습니다.",
      data: {
        items: cart.items,
        totalQuantity: cart.totalQuantity,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// 장바구니 비우기 (DELETE ALL)
const clearCart = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.json({
        success: true,
        message: "이미 비어있는 장바구니입니다.",
        data: { items: [], totalQuantity: 0, totalAmount: 0 },
      });
    }

    cart.items = [];
    await cart.save();

    return res.json({
      success: true,
      message: "장바구니를 비웠습니다.",
      data: { items: [], totalQuantity: 0, totalAmount: 0 },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};

