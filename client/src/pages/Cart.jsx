import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";
import api from "@/api";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/utils/format";

function Cart() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // CartContext에서 장바구니 아이템/합계/로딩/에러 상태를 공유해서 사용
  const { cart, loading, error, refreshCart } = useCart();
  // 화면 하단에 한 줄로 보여줄 액션 결과 메시지
  const [actionMessage, setActionMessage] = useState("");
  // 로그인 토큰을 한 번만 읽어 메모이제이션
  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  const handleIncrease = async (item) => {
    if (!token) {
      setActionMessage("수량 변경은 로그인 후 사용할 수 있습니다.");
      return;
    }
    try {
      await api.put(
        `/cart/${item._id}`,
        { quantity: item.quantity + 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // 서버 쪽 수량 변경 후, 항상 최신 장바구니를 다시 조회해 컨텍스트와 Navbar 배지를 동기화
      await refreshCart();
      setActionMessage("수량이 변경되었습니다.");
    } catch (_err) {
      setActionMessage("수량 변경 중 오류가 발생했습니다.");
    }
  };

  const handleDecrease = async (item) => {
    if (!token) {
      setActionMessage("수량 변경은 로그인 후 사용할 수 있습니다.");
      return;
    }
    const nextQty = item.quantity - 1;
    try {
      // 수량이 0 이하가 되면 아이템을 삭제, 그 외에는 수량만 감소
      if (nextQty <= 0) {
        await api.delete(`/cart/${item._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.put(
          `/cart/${item._id}`,
          { quantity: nextQty },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      await refreshCart();
      setActionMessage("수량이 변경되었습니다.");
    } catch (_err) {
      setActionMessage("수량 변경 중 오류가 발생했습니다.");
    }
  };

  const handleRemove = async (item) => {
    if (!token) {
      setActionMessage("삭제는 로그인 후 사용할 수 있습니다.");
      return;
    }
    try {
      await api.delete(`/cart/${item._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 특정 상품 제거 후에도 전체 장바구니/배지 상태를 다시 맞춰 줌
      await refreshCart();
      setActionMessage("상품이 장바구니에서 삭제되었습니다.");
    } catch (_err) {
      setActionMessage("상품 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleClear = async () => {
    if (!token) {
      setActionMessage("삭제는 로그인 후 사용할 수 있습니다.");
      return;
    }
    try {
      await api.delete("/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // 전부 삭제 후 장바구니를 비운 상태로 다시 조회
      await refreshCart();
      setActionMessage("장바구니를 비웠습니다.");
    } catch (_err) {
      setActionMessage("장바구니 비우기 중 오류가 발생했습니다.");
    }
  };

  const handleCheckout = () => {
    if (!token) {
      setActionMessage("결제는 로그인 후 사용할 수 있습니다.");
      return;
    }
    if (!cart.items.length) {
      setActionMessage("장바구니가 비어 있습니다.");
      return;
    }
    navigate("/checkout");
  };

  return (
    <div>
      <Navbar user={user} onLogout={logout} />
      <main
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>장바구니</h2>
        {loading ? (
          // 1) 로딩 상태
          <p>장바구니를 불러오는 중입니다...</p>
        ) : error ? (
          // 2) 에러 메시지
          <p>{error}</p>
        ) : cart.items.length === 0 ? (
          // 3) 장바구니가 비어 있을 때
          <p>장바구니가 비어 있습니다.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
              gap: 24,
              alignItems: "flex-start",
            }}
          >
            <section>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {cart.items.map((item) => (
                  <li
                    key={item._id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px minmax(0, 2fr) auto auto auto",
                      gap: 12,
                      padding: "12px 0",
                      borderBottom: "1px solid #eee",
                      alignItems: "center",
                    }}
                  >
                    {/* 썸네일 이미지 영역 */}
                    <div
                      style={{
                        width: 72,
                        height: 88,
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#f5f5f5",
                      }}
                    >
                      <img
                        src={
                          item.product?.image ||
                          item.product?.img ||
                          "https://picsum.photos/seed/cart-thumb/200/260"
                        }
                        alt={item.product?.name || "상품 이미지"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                    {/* 상품명 및 옵션 정보 */}
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {item.product?.name || "상품"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        옵션: {item.size || "-"} / {item.color || "-"}
                      </div>
                    </div>
                    {/* 수량 조절 UI */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleDecrease(item)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: "1px solid #ddd",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleIncrease(item)}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 4,
                          border: "1px solid #ddd",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                    {/* 아이템별 금액 */}
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      ₩{formatPrice((item.product?.price || 0) * item.quantity)}
                    </div>
                    {/* 한 아이템만 삭제 */}
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      style={{
                        fontSize: 12,
                        color: "#e53e3e",
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                      }}
                    >
                      삭제
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* 우측 주문 요약 섹션 */}
            <section
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>주문 요약</h3>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                <span>총 상품 수</span>
                <span>{cart.totalQuantity}개</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  marginBottom: 8,
                }}
              >
                <span>배송비</span>
                <span>무료</span>
              </div>
              <div
                style={{
                  borderTop: "1px solid #eee",
                  margin: "12px 0",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <span>총 결제 금액</span>
                <span>₩{formatPrice(cart.totalAmount || 0)}</span>
              </div>
              {/* 결제 버튼 (현재는 목업 수준, 실제 결제 연동은 이후 작업) */}
              <button
                type="button"
                onClick={handleCheckout}
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
                }}
              >
                결제하기
              </button>
              {/* 한 번에 장바구니 비우기 */}
              <button
                type="button"
                onClick={handleClear}
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
                장바구니 비우기
              </button>
              {/* 홈으로 이동해 쇼핑 계속하기 */}
              <button
                type="button"
                onClick={() => window.location.assign("/")}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  borderRadius: 6,
                  border: "none",
                  background: "none",
                  fontSize: 13,
                  cursor: "pointer",
                  color: "#555",
                  textDecoration: "underline",
                }}
              >
                쇼핑 계속하기
              </button>
              {actionMessage ? (
                <p style={{ marginTop: 10, fontSize: 12, color: "#555" }}>{actionMessage}</p>
              ) : null}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default Cart;

