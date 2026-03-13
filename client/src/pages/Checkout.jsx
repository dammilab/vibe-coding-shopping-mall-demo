import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";
import api from "@/api";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/utils/format";

// 장바구니 → 주문 → 포트원 결제까지 처리하는 3단계 Checkout 페이지
// (1) 서버에 주문(PENDING) 생성 → (2) IMP.request_pay 결제 → (3) 서버에서 결제 검증/확정
function Checkout() {
  const { user, logout } = useAuth();
  const { cart, refreshCart } = useCart();
  const navigate = useNavigate();

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  useEffect(() => {
    // 포트원(Iamport) 결제 모듈 초기화
    if (window.IMP) {
      window.IMP.init("imp87840182");
    }
  }, []);

  const [step, setStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [shippingForm, setShippingForm] = useState({
    firstName: user?.name || "",
    lastName: "",
    email: user?.email || "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    zipcode: "",
    requestMessage: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("CARD");

  const subtotal = cart.totalAmount || 0;
  const discountAmount = 0;
  const taxAmount = 0;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const handleChangeShipping = (e) => {
    const { name, value } = e.target;
    setShippingForm((prev) => ({ ...prev, [name]: value }));
  };

  // 현재 단계에 따라 다음 단계로 진행 (1: 배송정보 → 2: 결제수단, 2: 결제수단 → 3: 최종확인)
  const gotoNextStep = () => {
    if (step === 1) {
      if (!shippingForm.firstName || !shippingForm.email || !shippingForm.phone || !shippingForm.address1 || !shippingForm.city || !shippingForm.zipcode) {
        setError("필수 배송 정보를 모두 입력해주세요.");
        return;
      }
      setError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
  };

  // 뒤로 가기 버튼: 에러/안내 메시지 초기화 후 한 단계 이전으로 이동
  const gotoPrevStep = () => {
    setError("");
    setInfoMessage("");
    setStep((prev) => Math.max(1, prev - 1));
  };

  // 결제수단 코드 → pay_method 매핑
  // (현재는 PortOne 테스트 환경 기준으로 html5_inicis.INIpayTest 단일 PG만 사용)
  const PAY_METHOD_MAP = {
    CARD: "card",
    BANK_TRANSFER: "trans",
    VIRTUAL_ACCOUNT: "vbank",
    KAKAO_PAY: "card",
    NAVER_PAY: "card",
  };

  // IMP.request_pay를 Promise로 래핑
  const requestPay = (params) =>
    new Promise((resolve, reject) => {
      if (!window.IMP) {
        reject(new Error("IMP 객체를 찾을 수 없습니다. 페이지를 새로고침 해주세요."));
        return;
      }
      window.IMP.request_pay(params, (rsp) => {
        if (rsp.success) {
          resolve(rsp);
        } else {
          reject(new Error(rsp.error_msg || "결제가 취소되었습니다."));
        }
      });
    });

  const handlePlaceOrder = async () => {
    if (!token) {
      setError("로그인 후 주문할 수 있습니다.");
      return;
    }
    if (!cart.items.length) {
      setError("장바구니가 비어 있어 주문할 수 없습니다.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    let createdOrderId = null;

    try {
      // 1단계: 서버에 주문 생성 (PENDING 상태)
      const itemsPayload = cart.items.map((item) => ({
        productId: item.product?._id || item.product,
        quantity: item.quantity,
        unitPrice: item.product?.price || 0,
        discountUnitPrice: 0,
      }));

      const buyerName = `${shippingForm.firstName} ${shippingForm.lastName}`.trim();

      const createRes = await api.post(
        "/orders",
        {
          items: itemsPayload,
          buyer: {
            name: buyerName,
            phone: shippingForm.phone,
            email: shippingForm.email,
          },
          shipping: {
            recipientName: buyerName,
            phone: shippingForm.phone,
            zipcode: shippingForm.zipcode,
            address1: `${shippingForm.city} ${shippingForm.address1}`.trim(),
            address2: shippingForm.address2,
          },
          amounts: {
            subtotalAmount: subtotal,
            discountAmount,
            taxAmount,
            totalAmount,
          },
          payment: {
            paymentMethod,
            pgProvider: "html5_inicis.INIpayTest",
            requestedAmount: totalAmount,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const order = createRes.data?.data;
      createdOrderId = order?._id;

      if (!createdOrderId) throw new Error("주문 생성에 실패했습니다.");

      // 2단계: 포트원 결제창 호출
      const pay_method = PAY_METHOD_MAP[paymentMethod] || "card";

      const rsp = await requestPay({
        // PortOne 테스트 환경에서 공통으로 사용하는 PG 코드
        pg: "html5_inicis.INIpayTest",
        pay_method,
        merchant_uid: order.orderNumber,
        name: `${cart.items[0]?.product?.name || "상품"} 외 ${cart.items.length - 1}건`,
        amount: totalAmount,
        buyer_name: buyerName,
        buyer_tel: shippingForm.phone,
        buyer_email: shippingForm.email,
        buyer_addr: `${shippingForm.city} ${shippingForm.address1}`.trim(),
        buyer_postcode: shippingForm.zipcode || "",
      });

      // 3단계: 서버에 결제 검증 요청
      await api.post(
        `/orders/${createdOrderId}/confirm`,
        { imp_uid: rsp.imp_uid, merchant_uid: rsp.merchant_uid || order.orderNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setInfoMessage("주문이 완료되었습니다!");
      await refreshCart();
      navigate(`/order-success/${createdOrderId}`);
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      const message = serverMessage || err.message || "결제 중 오류가 발생했습니다.";
      setError(message);

      // 서버 측에서 주문은 그대로 두고, 실패 사유만 전달
      navigate(`/order-failure?reason=${encodeURIComponent(message)}`);
    } finally {
      setLoading(false);
    }
  };

  // 상단 단계 인디케이터 렌더링 (Shipping / Payment / Review)
  const renderStepHeader = () => {
    const steps = [
      { id: 1, label: "Shipping" },
      { id: 2, label: "Payment" },
      { id: 3, label: "Review" },
    ];

    return (
      <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
        {steps.map((s) => {
          const isActive = step === s.id;
          const isDone = step > s.id;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: isActive ? "#111" : isDone ? "#4caf50" : "#ddd",
                  background: isDone ? "#4caf50" : isActive ? "#111" : "#fff",
                  color: isActive || isDone ? "#fff" : "#999",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {s.id}
              </div>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#111" : "#777",
                }}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // 단계 1: 배송지/연락처/요청사항 입력 폼
  const renderShippingForm = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>First Name *</label>
        <input
          name="firstName"
          value={shippingForm.firstName}
          onChange={handleChangeShipping}
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Last Name</label>
        <input
          name="lastName"
          value={shippingForm.lastName}
          onChange={handleChangeShipping}
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Email *</label>
        <input
          name="email"
          type="email"
          value={shippingForm.email}
          onChange={handleChangeShipping}
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Phone Number *</label>
        <input
          name="phone"
          value={shippingForm.phone}
          onChange={handleChangeShipping}
          placeholder="+82-10-0000-0000"
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Address *</label>
        <input
          name="address1"
          value={shippingForm.address1}
          onChange={handleChangeShipping}
          placeholder="도로명 주소"
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd", marginBottom: 8 }}
        />
        <input
          name="address2"
          value={shippingForm.address2}
          onChange={handleChangeShipping}
          placeholder="상세 주소 (동/호수 등)"
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>배송 요청사항 (선택)</label>
        <textarea
          name="requestMessage"
          value={shippingForm.requestMessage}
          onChange={handleChangeShipping}
          placeholder="예: 부재 시 문 앞에 놓아주세요."
          rows={3}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ddd",
            resize: "vertical",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>City *</label>
        <input
          name="city"
          value={shippingForm.city}
          onChange={handleChangeShipping}
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
      <div>
        <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>ZIP Code *</label>
        <input
          name="zipcode"
          value={shippingForm.zipcode}
          onChange={handleChangeShipping}
          style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #ddd" }}
        />
      </div>
    </div>
  );

  // 단계 2: 결제수단 선택 영역 (포트원 PG와 매핑됨)
  const renderPaymentForm = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>결제 수단 선택</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {["CARD", "BANK_TRANSFER", "VIRTUAL_ACCOUNT", "KAKAO_PAY", "NAVER_PAY"].map((method) => (
            <label
              key={method}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 6,
                border: paymentMethod === method ? "2px solid #111" : "1px solid #ddd",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method}
                checked={paymentMethod === method}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span>
                {method === "CARD"
                  ? "신용/체크카드"
                  : method === "BANK_TRANSFER"
                  ? "계좌이체"
                  : method === "VIRTUAL_ACCOUNT"
                  ? "가상계좌"
                  : method === "KAKAO_PAY"
                  ? "카카오페이"
                  : "네이버페이"}
              </span>
            </label>
          ))}
        </div>
      </div>
      <div
        style={{
          padding: 16,
          borderRadius: 8,
          border: "1px solid #eee",
          background: "#fafafa",
          fontSize: 12,
          color: "#555",
        }}
      >
        포트원(iamport) 결제창이 팝업으로 열립니다.<br />
        "Review" 단계에서 한 번 더 내용을 확인한 뒤 주문을 완료할 수 있습니다.
      </div>
    </div>
  );

  // 단계 3: 주문 제출 전, 사용자가 마지막으로 확인하는 요약 정보
  const renderReview = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14 }}>
      <div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>배송 정보</p>
        <p>
          {shippingForm.firstName} {shippingForm.lastName}
        </p>
        <p>{shippingForm.phone}</p>
        <p>{shippingForm.email}</p>
        <p>
          {shippingForm.city} {shippingForm.address1} {shippingForm.address2}
        </p>
        <p>{shippingForm.zipcode}</p>
      </div>
      <div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>결제 수단</p>
        <p>{paymentMethod}</p>
      </div>
    </div>
  );

  // 현재 step에 따라 좌측 메인 콘텐츠 스위칭
  const renderLeftContent = () => {
    if (step === 1) return renderShippingForm();
    if (step === 2) return renderPaymentForm();
    return renderReview();
  };

  // 우측 주문 요약 카드: 장바구니 아이템/합계/액션 버튼(다음 단계 또는 결제 실행)
  const renderRightSummary = () => (
    <section
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 16,
        background: "#fff",
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>Order Summary</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", maxHeight: 220, overflowY: "auto" }}>
        {cart.items.map((item) => (
          <li
            key={item._id}
            style={{
              display: "grid",
              gridTemplateColumns: "56px minmax(0,1fr) auto",
              gap: 8,
              padding: "8px 0",
              borderBottom: "1px solid #f3f3f3",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 52,
                height: 64,
                borderRadius: 8,
                overflow: "hidden",
                background: "#f5f5f5",
              }}
            >
              <img
                src={
                  item.product?.image ||
                  item.product?.img ||
                  "https://picsum.photos/seed/checkout-thumb/160/200"
                }
                alt={item.product?.name || "상품 이미지"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {item.product?.name || "상품"}
              </div>
              <div style={{ fontSize: 11, color: "#777" }}>
                {item.size || "-"} / {item.color || "-"} · {item.quantity}개
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              ₩{formatPrice((item.product?.price || 0) * item.quantity)}
            </div>
          </li>
        ))}
      </ul>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        <span>Subtotal ({cart.totalQuantity} items)</span>
        <span>₩{formatPrice(subtotal)}</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        <span>Shipping</span>
        <span>FREE</span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <span>Tax</span>
        <span>₩{formatPrice(taxAmount)}</span>
      </div>
      <div
        style={{
          borderTop: "1px solid #eee",
          paddingTop: 10,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        <span>Total</span>
        <span>₩{formatPrice(totalAmount)}</span>
      </div>
      <button
        type="button"
        onClick={step === 3 ? handlePlaceOrder : gotoNextStep}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px 0",
          borderRadius: 6,
          border: "none",
          background: "#111",
          color: "#fff",
          fontWeight: 600,
          fontSize: 14,
          cursor: "pointer",
          marginBottom: 8,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {step === 3 ? (loading ? "주문 처리 중..." : "주문하기") : "다음 단계로"}
      </button>
      {step > 1 && (
        <button
          type="button"
          onClick={gotoPrevStep}
          disabled={loading}
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: 6,
            border: "1px solid #ddd",
            background: "#fff",
            fontSize: 13,
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          이전 단계로
        </button>
      )}
      <div style={{ fontSize: 11, color: "#888", marginTop: 8 }}>
        Secure SSL encrypted checkout · VISA · MC · AMEX · PAYPAL (UI 데모용 표시)
      </div>
      {error && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#e53e3e" }}>
          {error}
        </p>
      )}
      {infoMessage && (
        <p style={{ marginTop: 10, fontSize: 12, color: "#2f855a" }}>
          {infoMessage}
        </p>
      )}
    </section>
  );

  return (
    <div>
      <Navbar user={user} onLogout={logout} />
      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Checkout</h2>
        {renderStepHeader()}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 3fr) minmax(280px, 2fr)",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <section
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 20,
              background: "#fff",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>
              {step === 1 ? "Shipping Information" : step === 2 ? "Payment" : "Review & Confirm"}
            </h3>
            {renderLeftContent()}
          </section>
          {renderRightSummary()}
        </div>
      </main>
    </div>
  );
}

export default Checkout;

