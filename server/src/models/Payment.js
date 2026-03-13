const mongoose = require("mongoose");

const PAYMENT_STATUS = ["READY", "APPROVED", "FAILED", "CANCELLED", "REFUNDED"];

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: ["CARD", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", "KAKAO_PAY", "NAVER_PAY"],
      required: true,
    },

    pgProvider: {
      type: String,
      trim: true,
    },
    pgTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedAmount: {
      type: Number,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUS,
      required: true,
      default: "READY",
    },

    approvedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },

    failureCode: {
      type: String,
      trim: true,
    },
    failureMessage: {
      type: String,
      trim: true,
    },

    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);

