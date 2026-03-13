const mongoose = require("mongoose");

const ITEM_STATUS = ["ORDERED", "CANCELLED", "RETURNED"];

const orderItemSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountUnitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    lineSubtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    lineDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemStatus: {
      type: String,
      enum: ITEM_STATUS,
      required: true,
      default: "ORDERED",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("OrderItem", orderItemSchema);

