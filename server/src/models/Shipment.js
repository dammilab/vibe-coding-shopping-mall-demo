const mongoose = require("mongoose");

const SHIPMENT_STATUS = ["READY", "IN_TRANSIT", "DELIVERED", "RETURNED"];

const shipmentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    carrier: {
      type: String,
      required: true,
      trim: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    shipmentStatus: {
      type: String,
      enum: SHIPMENT_STATUS,
      required: true,
      default: "READY",
    },

    shippedAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Shipment", shipmentSchema);

