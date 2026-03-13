const mongoose = require("mongoose");

// 주문 전체의 진행 상태
// - PENDING: 주문 생성 직후 (결제 대기 또는 검증 전)
// - PAID: 결제까지 완료된 상태
// - PREPARING: 배송 준비 중(포장, 출고 준비 등)
// - SHIPPED: 택배사에 인계되어 배송 중
// - DELIVERED: 고객에게 최종 배송 완료
// - CANCELLED: 주문 취소
const ORDER_STATUS = ["PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];

// 결제 레코드의 상태
// - READY: 결제 시도 전 또는 결제창만 열린 상태
// - PAID: 결제 성공(포트원 등 PG에서 승인)
// - FAILED: 결제 실패
// - CANCELLED: 결제 취소(승인 취소 포함)
// - REFUNDED: 환불 완료
const PAYMENT_STATUS = ["READY", "PAID", "FAILED", "CANCELLED", "REFUNDED"];

// 물류/배송 이행 상태
// - UNFULFILLED: 아직 출고 전
// - PARTIAL: 일부만 발송된 상태(부분 배송)
// - FULFILLED: 주문 수량 전체 출고 완료
// - RETURNED: 반품 처리 완료
const FULFILLMENT_STATUS = ["UNFULFILLED", "PARTIAL", "FULFILLED", "RETURNED"];

const orderSchema = new mongoose.Schema(
  {
    // 화면에 노출되는 주문번호 (PG merchant_uid 등으로도 활용)
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    // 주문을 생성한 사용자
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 주문 상태(업무 플로우 기준)
    orderStatus: {
      type: String,
      enum: ORDER_STATUS,
      required: true,
      default: "PENDING",
    },
    // 결제 상태(PG 응답 기준)
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      required: true,
      default: "READY",
    },
    // 배송/물류 이행 상태
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUS,
      required: true,
      default: "UNFULFILLED",
    },

    // 주문 금액 관련
    // subtotalAmount: 상품 금액 합계(할인 전 기준)
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // discountAmount: 쿠폰·프로모션 등 전체 할인 금액
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // taxAmount: 부가세 등 세금 금액(필요 시 사용)
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // totalAmount: 실제 결제/청구 금액
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // 통화 단위 (기본 KRW)
    currency: {
      type: String,
      default: "KRW",
    },

    // 구매자 정보(계정 정보와 별도 스냅샷)
    buyerName: {
      type: String,
      required: true,
      trim: true,
    },
    buyerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    buyerEmail: {
      type: String,
      required: true,
      trim: true,
    },

    // 수령인/배송지 정보
    shippingRecipientName: {
      type: String,
      required: true,
      trim: true,
    },
    shippingPhone: {
      type: String,
      required: true,
      trim: true,
    },
    shippingZipcode: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress1: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress2: {
      type: String,
      default: "",
      trim: true,
    },

    // 주문·결제·완료 시점 기록
    placedAt: {
      type: Date,
      default: Date.now,
    },
    paidAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);

