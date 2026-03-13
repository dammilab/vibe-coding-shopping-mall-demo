const mongoose = require("mongoose");

// 개별 장바구니 아이템 스키마
// - 어떤 상품을
// - 어떤 옵션(size, color)으로
// - 몇 개(quantity) 담았는지 표현
const cartItemSchema = new mongoose.Schema(
  {
    // 담긴 상품
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // 수량 (최소 1개 이상)
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // 선택한 사이즈 옵션 (예: S, M, L ...)
    size: {
      type: String,
      default: "",
      trim: true,
    },
    // 선택한 컬러 옵션 (예: blue, black ...)
    color: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    // cart.items 배열 안에 중첩될 서브 문서이며
    // 각 아이템을 식별하기 위해 _id를 유지한다.
  }
);

// 장바구니 스키마
// - 유저 1명당 장바구니 1개를 갖는 구조
// - items 배열 안에 cartItemSchema 항목들이 들어감
const cartSchema = new mongoose.Schema(
  {
    // 장바구니 주인 유저
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // 한 유저당 장바구니 한 개
      index: true,
    },
    // 장바구니에 담긴 상품들
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    // createdAt, updatedAt 자동 관리
    timestamps: true,
    // virtual 필드를 JSON/객체 변환 시 함께 노출
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 인스턴스 메소드: 총 수량 계산
// 모든 아이템의 quantity 합계를 반환
cartSchema.methods.getTotalQuantity = function getTotalQuantity() {
  if (!Array.isArray(this.items)) return 0;
  return this.items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    return sum + qty;
  }, 0);
};

// 인스턴스 메소드: 총 금액 계산
// 각 아이템: (product.price * quantity)의 총합
// product가 populate되지 않았거나 price가 없으면 0으로 계산
cartSchema.methods.getTotalAmount = function getTotalAmount() {
  if (!Array.isArray(this.items)) return 0;
  return this.items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = item.product && typeof item.product.price === "number"
      ? item.product.price
      : 0;
    return sum + price * qty;
  }, 0);
};

// virtual 필드: totalQuantity
// cart.totalQuantity 로 접근 가능
cartSchema.virtual("totalQuantity").get(function totalQuantityGetter() {
  return this.getTotalQuantity();
});

// virtual 필드: totalAmount
// cart.totalAmount 로 접근 가능
cartSchema.virtual("totalAmount").get(function totalAmountGetter() {
  return this.getTotalAmount();
});

// Cart 컬렉션으로 내보내기
module.exports = mongoose.model("Cart", cartSchema);
