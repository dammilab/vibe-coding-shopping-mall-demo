const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    fromStatus: {
      type: String,
      trim: true,
    },
    toStatus: {
      type: String,
      required: true,
      trim: true,
    },

    changedBy: {
      type: String,
      enum: ["USER", "ADMIN", "SYSTEM"],
      required: true,
      default: "SYSTEM",
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

module.exports = mongoose.model("OrderStatusHistory", orderStatusHistorySchema);

