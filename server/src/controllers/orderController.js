const axios = require("axios");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const Payment = require("../models/Payment");
const Shipment = require("../models/Shipment");
const Cart = require("../models/Cart");
const OrderStatusHistory = require("../models/OrderStatusHistory");

// ─────────────────────────────────────────────
// 포트원(Iamport) REST API 액세스 토큰 발급
// IMP_KEY, IMP_SECRET은 .env에서 관리
// ─────────────────────────────────────────────
const getIamportToken = async () => {
  const res = await axios.post("https://api.iamport.kr/users/getToken", {
    imp_key: process.env.IMP_KEY,
    imp_secret: process.env.IMP_SECRET,
  });
  return res.data.response.access_token;
};

// ─────────────────────────────────────────────
// 주문 생성
// POST /api/orders
//
// 요청 바디:
// {
//   items:   [{ productId, quantity, unitPrice, discountUnitPrice }],
//   buyer:   { name, phone, email },
//   shipping:{ recipientName, phone, zipcode, address1, address2 },
//   amounts: { subtotalAmount, discountAmount, taxAmount, totalAmount },
//   payment: { paymentMethod, pgProvider, requestedAmount }
// }
//
// 처리 순서:
//   1. 입력값 유효성 검사
//   2. 서버에서 금액 재계산 및 위변조 방지 검증
//   3. 동일 사용자·금액으로 최근에 생성된 중복 주문 여부 체크
//   4. 고유 주문번호(orderNumber) 생성
//   5. Order 문서 생성 (PENDING)
//   6. OrderItem 다건 삽입 (라인별 금액 계산 포함)
//   7. Payment 문서 생성 (READY)
//   8. OrderStatusHistory에 최초 상태(PENDING) 기록
//
// ※ 로컬 standalone MongoDB에서도 동작하도록 트랜잭션 없이 순차 처리
// ─────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { items, buyer, shipping, amounts, payment } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "주문 상품이 없습니다." });
    }

    if (!amounts || amounts.totalAmount == null) {
      return res.status(400).json({ success: false, message: "주문 금액 정보가 없습니다." });
    }

    // 1-1) 서버에서 주문 금액 재계산 (클라이언트 금액 위변조 방지)
    const calcSubtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const discountUnit = Number(item.discountUnitPrice) || 0;
      return sum + (unit - discountUnit) * qty;
    }, 0);

    if (calcSubtotal <= 0) {
      return res.status(400).json({ success: false, message: "주문 금액이 0원 이하입니다." });
    }

    if (calcSubtotal !== Number(amounts.totalAmount)) {
      return res.status(400).json({
        success: false,
        message: "요청된 주문 금액이 서버 계산 금액과 일치하지 않습니다.",
      });
    }

    // 1-2) 최근 동일 금액·상태 주문이 있는지 중복 체크 (더블 클릭/새로고침 방지용)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const duplicate = await Order.findOne({
      user: req.user.id,
      totalAmount: amounts.totalAmount,
      orderStatus: { $in: ["PENDING", "PAID"] },
      createdAt: { $gte: oneMinuteAgo },
    }).sort({ createdAt: -1 });

    if (duplicate) {
      // 이미 같은 조건으로 바로 직전에 주문이 생성된 경우, 새로 만들지 않고 기존 주문을 반환
      return res.status(200).json({
        success: true,
        duplicated: true,
        data: duplicate,
        message: "이미 동일 금액으로 최근 생성된 주문이 있어 동일 주문으로 간주합니다.",
      });
    }

    // 타임스탬프 + 난수로 중복 없는 주문번호 생성
    const now = Date.now();
    const orderNumber = `ORD-${now}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;

    // 1) 주문 헤더 생성
    const order = await Order.create({
      orderNumber,
      user: req.user.id,
      orderStatus: "PENDING",
      paymentStatus: "READY",
      fulfillmentStatus: "UNFULFILLED",
      subtotalAmount: amounts.subtotalAmount,
      discountAmount: amounts.discountAmount ?? 0,
      taxAmount: amounts.taxAmount ?? 0,
      totalAmount: amounts.totalAmount,
      currency: "KRW",
      buyerName: buyer?.name,
      buyerPhone: buyer?.phone,
      buyerEmail: buyer?.email,
      shippingRecipientName: shipping?.recipientName,
      shippingPhone: shipping?.phone,
      shippingZipcode: shipping?.zipcode,
      shippingAddress1: shipping?.address1,
      shippingAddress2: shipping?.address2 ?? "",
      placedAt: new Date(),
    });

    // 2) 주문 라인 아이템 생성 (각 상품별 금액 계산)
    const orderItemsPayload = items.map((item) => {
      const quantity = item.quantity;
      const unitPrice = item.unitPrice;
      const discountUnitPrice = item.discountUnitPrice ?? 0;
      const lineSubtotal = unitPrice * quantity;
      const lineDiscount = discountUnitPrice * quantity;
      const lineTotal = lineSubtotal - lineDiscount;

      return {
        order: order._id,
        product: item.productId,
        quantity,
        unitPrice,
        discountUnitPrice,
        lineSubtotal,
        lineDiscount,
        lineTotal,
        taxAmount: 0,
        itemStatus: "ORDERED",
      };
    });

    await OrderItem.insertMany(orderItemsPayload);

    // 3) 결제 레코드 생성 (포트원 결제 전이므로 READY 상태)
    if (payment && payment.paymentMethod && payment.requestedAmount != null) {
      await Payment.create({
        order: order._id,
        paymentMethod: payment.paymentMethod,
        pgProvider: payment.pgProvider,
        requestedAmount: payment.requestedAmount,
        approvedAmount: null,
        paymentStatus: "READY",
      });
    }

    // 4) 상태 변경 이력 기록
    await OrderStatusHistory.create({
      order: order._id,
      fromStatus: null,
      toStatus: "PENDING",
      changedBy: "USER",
    });

    const populated = await Order.findById(order._id);

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 전체 주문 목록 조회 (관리자 전용)
// GET /api/orders
// ─────────────────────────────────────────────
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 내 주문 목록 조회 (로그인 유저 본인 것만)
// GET /api/orders/my
// ─────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 특정 주문 상세 조회
// GET /api/orders/:id
// - 일반 유저: 본인 주문만 조회 가능
// - 관리자: 모든 주문 조회 가능
// - 응답에 OrderItem 목록(product 정보 populate 포함)을 함께 반환
// ─────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.user_type === "admin";
    // 관리자는 전체 주문, 일반 유저는 본인 주문만
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    const items = await OrderItem.find({ order: order._id }).populate("product");

    res.json({
      success: true,
      data: {
        order,
        items,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 주문 수정 (관리자 전용)
// PUT /api/orders/:id
// - req.body의 필드를 그대로 업데이트 (runValidators 적용)
// - orderStatus가 변경된 경우 상태 이력을 자동 기록
// ─────────────────────────────────────────────
const updateOrder = async (req, res, next) => {
  try {
    const existing = await Order.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    const prevStatus = existing.orderStatus;

    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // orderStatus가 실제로 변경된 경우에만 이력을 남긴다
    if (req.body.orderStatus && req.body.orderStatus !== prevStatus) {
      await OrderStatusHistory.create({
        order: order._id,
        fromStatus: prevStatus,
        toStatus: req.body.orderStatus,
        changedBy: "ADMIN",
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 주문 삭제 (관리자 전용)
// DELETE /api/orders/:id
// - 주문 헤더(Order)뿐 아니라 연관 컬렉션도 모두 함께 삭제
//   (OrderItem, Payment, Shipment, OrderStatusHistory)
// ─────────────────────────────────────────────
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    await Promise.all([
      OrderItem.deleteMany({ order: order._id }),
      Payment.deleteMany({ order: order._id }),
      Shipment.deleteMany({ order: order._id }),
      OrderStatusHistory.deleteMany({ order: order._id }),
      Order.deleteOne({ _id: order._id }),
    ]);

    res.json({ success: true, message: "주문이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 결제 검증 및 주문 확정
// POST /api/orders/:id/confirm
// body: { imp_uid, merchant_uid }
//
// 포트원 결제창 완료 후 서버에서 결제를 재검증하는 핵심 로직
// 처리 순서:
//   1. imp_uid 존재 여부 확인
//   2. 해당 주문이 본인 것인지 확인, paymentStatus가 READY인지 확인 (중복 확정 방지)
//   3. 포트원 REST API로 액세스 토큰 발급
//   4. 포트원에서 imp_uid로 결제 내역 조회
//   5. DB의 totalAmount와 포트원 응답 amount 비교 (위변조 방지)
//      - 불일치 시 포트원 결제 즉시 취소 후 FAILED 처리
//   6. 포트원 결제 status가 "paid"인지 확인
//   7. 검증 통과 시:
//      - Order: orderStatus/paymentStatus → PAID, paidAt 기록
//      - Payment: pgTransactionId(imp_uid), approvedAmount, APPROVED 업데이트
//      - OrderStatusHistory: PENDING → PAID 이력 기록
//      - Cart: 해당 유저 장바구니 비우기
// ─────────────────────────────────────────────
const confirmPayment = async (req, res, next) => {
  try {
    const { imp_uid, merchant_uid } = req.body;

    if (!imp_uid && !merchant_uid) {
      return res.status(400).json({ success: false, message: "imp_uid 또는 merchant_uid가 필요합니다." });
    }

    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    // 이미 PAID인 경우: 이전 요청에서 처리됐으나 클라이언트가 500 등을 받은 상황 → 성공으로 간주하고 주문 정보 반환 (페이지 정상 표시)
    if (order.paymentStatus === "PAID") {
      return res.json({ success: true, data: order });
    }

    if (order.paymentStatus !== "READY") {
      return res.status(400).json({ success: false, message: "이미 처리된 주문입니다." });
    }

    // 포트원 액세스 토큰 발급 (.env의 IMP_KEY, IMP_SECRET 필요)
    let accessToken;
    try {
      accessToken = await getIamportToken();
    } catch (tokenErr) {
      return res.status(502).json({
        success: false,
        message: "결제 검증 서비스 연결에 실패했습니다. IMP_KEY, IMP_SECRET 설정을 확인해주세요.",
      });
    }

    // 1차: imp_uid로 포트원 결제 내역 조회
    let paymentResult = null;
    try {
      if (imp_uid) {
        paymentResult = await axios.get(
          `https://api.iamport.kr/payments/${imp_uid}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    } catch (payErr) {
      // 2차: imp_uid 조회 실패 시 merchant_uid 기준 조회로 fallback
      if (!merchant_uid) {
        const msg = payErr.response?.data?.message || payErr.message || "결제 내역 조회 실패";
        return res.status(400).json({
          success: false,
          message: `포트원 결제 검증 실패: ${msg}`,
        });
      }
    }

    if (!paymentResult && merchant_uid) {
      try {
        paymentResult = await axios.get(
          `https://api.iamport.kr/payments/find/${merchant_uid}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      } catch (findErr) {
        const msg = findErr.response?.data?.message || findErr.message || "merchant_uid 조회 실패";
        return res.status(400).json({
          success: false,
          message: `포트원 결제 검증 실패: ${msg}`,
        });
      }
    }

    const impPayment = paymentResult?.data?.response;

    if (!impPayment) {
      return res.status(400).json({
        success: false,
        message: "포트원에서 결제 내역을 찾을 수 없습니다.",
      });
    }

    // 주문번호와 결제 merchant_uid 일치 검증
    if (impPayment.merchant_uid !== order.orderNumber) {
      return res.status(400).json({
        success: false,
        message: "결제 주문번호가 현재 주문과 일치하지 않습니다.",
      });
    }

    // 금액 위변조 검증: DB의 결제 요청금액 vs 포트원 실제 결제금액 (타입 보정)
    const impAmount = Number(impPayment.amount);
    const orderAmount = Number(order.totalAmount);
    if (impAmount !== orderAmount) {
      // 불일치 → 포트원에서 즉시 취소 후 FAILED 처리
      await axios.post(
        "https://api.iamport.kr/payments/cancel",
        { imp_uid: impPayment.imp_uid, reason: "결제 금액 위변조 의심" },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      order.paymentStatus = "FAILED";
      await order.save();
      return res.status(400).json({ success: false, message: "결제 금액이 일치하지 않습니다. 결제가 취소되었습니다." });
    }

    // 포트원 결제 상태 확인 (paid 가 아니면 미완료)
    if (impPayment.status !== "paid") {
      order.paymentStatus = "FAILED";
      await order.save();
      return res.status(400).json({ success: false, message: `결제가 완료되지 않았습니다. (상태: ${impPayment.status})` });
    }

    // 검증 통과 → Order 상태 확정
    order.orderStatus = "PAID";
    order.paymentStatus = "PAID";
    order.paidAt = new Date();
    await order.save();

    // Payment 문서에 포트원 거래 정보 기록
    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        pgTransactionId: impPayment.imp_uid,
        approvedAmount: impPayment.amount,
        paymentStatus: "APPROVED",
        approvedAt: new Date(),
        rawPayload: impPayment, // PG 원문 응답 저장 (CS/환불 대응용)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 상태 이력 기록
    await OrderStatusHistory.create({
      order: order._id,
      fromStatus: "PENDING",
      toStatus: "PAID",
      changedBy: "SYSTEM",
    });

    // 결제 성공 후 해당 유저의 장바구니 비우기
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } }
    );

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
// 주문 취소
// POST /api/orders/:id/cancel
// - 일반 유저: 본인 주문만 취소 가능
// - 관리자: 모든 주문 취소 가능
// - 취소 가능 조건:
//     orderStatus가 PENDING 또는 PAID 이고,
//     fulfillmentStatus가 UNFULFILLED (아직 발송 전)인 경우만 허용
// - paymentStatus가 READY/PAID였으면 함께 CANCELLED 처리
// - 상태 변경 이력 기록
// ─────────────────────────────────────────────
const cancelOrder = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.user_type === "admin";
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({ success: false, message: "주문을 찾을 수 없습니다." });
    }

    // 발송 시작 후 또는 취소/완료 상태는 취소 불가
    if (!["PENDING", "PAID"].includes(order.orderStatus) || order.fulfillmentStatus !== "UNFULFILLED") {
      return res
        .status(400)
        .json({ success: false, message: "현재 상태에서는 주문을 취소할 수 없습니다." });
    }

    const prevStatus = order.orderStatus;

    order.orderStatus = "CANCELLED";
    // 결제가 이미 이루어진 경우 결제 상태도 함께 CANCELLED로 전환
    if (["READY", "PAID"].includes(order.paymentStatus)) {
      order.paymentStatus = "CANCELLED";
    }

    await order.save();

    await OrderStatusHistory.create({
      order: order._id,
      fromStatus: prevStatus,
      toStatus: "CANCELLED",
      changedBy: isAdmin ? "ADMIN" : "USER",
    });

    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  confirmPayment,
  getOrders,
  getMyOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  cancelOrder,
};
