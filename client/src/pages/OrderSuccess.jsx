import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";
import api from "@/api";
import { formatPrice } from "@/utils/format";

function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || !token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(res.data?.data?.order || null);
        setItems(res.data?.data?.items || []);
      } catch {
        setError("주문 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, token]);

  const formattedDate = order?.placedAt
    ? new Date(order.placedAt).toLocaleDateString("ko-KR")
    : "";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <Navbar user={user} onLogout={logout} />
      <main
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "32px 16px 48px",
        }}
      >
        <section
          style={{
            maxWidth: 720,
            margin: "0 auto",
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 32,
            boxShadow: "0 12px 32px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#e6f6ec",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <span style={{ fontSize: 32, color: "#16a34a" }}>✓</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              주문이 성공적으로 완료되었습니다!
            </h1>
            <p style={{ fontSize: 14, color: "#555", marginBottom: 2 }}>
              주문해 주셔서 감사합니다.
            </p>
            <p style={{ fontSize: 13, color: "#777" }}>
              주문 확인 메일을 곧 받아보실 수 있습니다.
            </p>
          </div>

          {loading ? (
            <p style={{ textAlign: "center", fontSize: 14 }}>주문 정보를 불러오는 중입니다...</p>
          ) : error ? (
            <p style={{ textAlign: "center", fontSize: 14, color: "#e53e3e" }}>{error}</p>
          ) : order ? (
            <>
              <div
                style={{
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 24,
                  marginTop: 8,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
                  gap: 24,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>주문 정보</h2>
                  <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                    <p>
                      <strong style={{ display: "inline-block", width: 80 }}>주문 번호</strong>
                      <span>{order.orderNumber}</span>
                    </p>
                    <p>
                      <strong style={{ display: "inline-block", width: 80 }}>주문 날짜</strong>
                      <span>{formattedDate}</span>
                    </p>
                    <p>
                      <strong style={{ display: "inline-block", width: 80 }}>주문자</strong>
                      <span>{order.buyerName}</span>
                    </p>
                    <p>
                      <strong style={{ display: "inline-block", width: 80 }}>결제 금액</strong>
                      <span>₩{formatPrice(order.totalAmount || 0)}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>배송 정보</h2>
                  <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                    <p>{order.shippingRecipientName}</p>
                    <p>{order.shippingPhone}</p>
                    <p>
                      {order.shippingZipcode} {order.shippingAddress1} {order.shippingAddress2}
                    </p>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 24,
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 16,
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>주문 상품</h2>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {items.map((item) => (
                    <li
                      key={item._id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px minmax(0, 1fr) auto",
                        gap: 12,
                        padding: "10px 0",
                        borderBottom: "1px solid #f5f5f5",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
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
                            "https://picsum.photos/seed/order-success/200/240"
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
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                          {item.product?.name || "상품"}
                        </div>
                        <div style={{ fontSize: 12, color: "#777" }}>
                          수량 {item.quantity}개
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        ₩{formatPrice(item.lineTotal || 0)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 24,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/orders")}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              주문 목록 보기
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              홈으로 가기
            </button>
            <button
              type="button"
              onClick={() => navigate("/products")}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "none",
                background: "#111",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              쇼핑 계속하기
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OrderSuccess;

