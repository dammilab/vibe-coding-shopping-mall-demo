import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";
import api from "@/api";
import { formatPrice } from "@/utils/format";

const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "processing", label: "처리중" },
  { key: "shipping", label: "배송중" },
  { key: "done", label: "완료" },
];

const STATUS_LABEL = {
  PENDING: "처리중",
  PAID: "처리중",
  PREPARING: "처리중",
  SHIPPED: "배송중",
  DELIVERED: "완료",
  CANCELLED: "취소",
};

const STATUS_STYLE = {
  PENDING: { color: "#8a6d1f", background: "#fdf6d8" },
  PAID: { color: "#8a6d1f", background: "#fdf6d8" },
  PREPARING: { color: "#8a6d1f", background: "#fdf6d8" },
  SHIPPED: { color: "#1d4ed8", background: "#e0ecff" },
  DELIVERED: { color: "#15803d", background: "#e8f8ec" },
  CANCELLED: { color: "#991b1b", background: "#fee2e2" },
};

const inProcessing = (status) => ["PENDING", "PAID", "PREPARING"].includes(status);
const inShipping = (status) => status === "SHIPPED";
const inDone = (status) => ["DELIVERED", "CANCELLED"].includes(status);

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10);
};

const estimateDeliveryRange = (value) => {
  if (!value) return "배송일 정보 준비중";
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return "배송일 정보 준비중";
  const start = new Date(base);
  const end = new Date(base);
  start.setDate(start.getDate() + 5);
  end.setDate(end.getDate() + 7);
  const fmt = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
};

function MyOrders() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState("all");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) {
        setLoading(false);
        setError("로그인이 필요합니다.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const baseRes = await api.get("/orders/my", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const baseOrders = baseRes.data?.data || [];
        const detailPromises = baseOrders.map((baseOrder) =>
          api
            .get(`/orders/${baseOrder._id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .then((detailRes) => ({
              ...baseOrder,
              items: detailRes.data?.data?.items || [],
            }))
            .catch(() => ({
              ...baseOrder,
              items: [],
            }))
        );

        const withItems = await Promise.all(detailPromises);
        setOrders(withItems);
      } catch {
        setError("주문 내역을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  const filteredOrders = useMemo(() => {
    if (selectedTab === "all") return orders;
    if (selectedTab === "processing") {
      return orders.filter((order) => inProcessing(order.orderStatus));
    }
    if (selectedTab === "shipping") {
      return orders.filter((order) => inShipping(order.orderStatus));
    }
    return orders.filter((order) => inDone(order.orderStatus));
  }, [orders, selectedTab]);

  const tabCounts = useMemo(
    () => ({
      all: orders.length,
      processing: orders.filter((o) => inProcessing(o.orderStatus)).length,
      shipping: orders.filter((o) => inShipping(o.orderStatus)).length,
      done: orders.filter((o) => inDone(o.orderStatus)).length,
    }),
    [orders]
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f6f6f6" }}>
      <Navbar user={user} onLogout={logout} />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 20px 56px" }}>
        <h1 style={{ textAlign: "center", fontSize: 28, marginBottom: 20, fontWeight: 700 }}>
          주문 내역
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 4,
            marginBottom: 20,
            background: "#f2f2f2",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {STATUS_TABS.map((tab) => {
            const active = selectedTab === tab.key;
            const count = tabCounts[tab.key] ?? 0;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                style={{
                  height: 40,
                  borderRadius: 7,
                  border: "none",
                  fontSize: 15,
                  fontWeight: active ? 700 : 500,
                  background: active ? "#fff" : "transparent",
                  color: "#111",
                  cursor: "pointer",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    minWidth: 20,
                    padding: "2px 6px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundColor: active ? "#111" : "#e5e5e5",
                    color: active ? "#fff" : "#555",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", fontSize: 16, color: "#555", padding: "50px 0" }}>
            주문 내역을 불러오는 중입니다...
          </p>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <p style={{ fontSize: 16, color: "#c62828", marginBottom: 12 }}>{error}</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              style={{
                height: 48,
                padding: "0 20px",
                borderRadius: 8,
                border: "none",
                background: "#111",
                color: "#fff",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              로그인하러 가기
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              border: "1px solid #ececec",
              padding: "52px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 16, color: "#666", marginBottom: 12 }}>주문 내역이 없습니다.</p>
            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                height: 48,
                padding: "0 20px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              쇼핑하러 가기
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {filteredOrders.map((order) => {
              const label = STATUS_LABEL[order.orderStatus] || "처리중";
              const statusStyle = STATUS_STYLE[order.orderStatus] || STATUS_STYLE.PENDING;
              return (
                <article
                  key={order._id}
                  style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid #e5e5e5",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      borderBottom: "1px solid #f1f1f1",
                      padding: "16px 20px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
                        주문 #{order.orderNumber}
                      </p>
                      <p style={{ fontSize: 13, color: "#555" }}>주문일: {formatDate(order.placedAt)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          ...statusStyle,
                        }}
                      >
                        {label}
                      </span>
                      <p style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
                        ${formatPrice(order.totalAmount || 0)}
                      </p>
                    </div>
                  </div>

                  <div style={{ padding: "14px 20px 8px" }}>
                    {(order.items || []).map((item) => (
                      <div
                        key={item._id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px minmax(0, 1fr)",
                          gap: 12,
                          alignItems: "center",
                          padding: "8px 0",
                        }}
                      >
                        <div
                          style={{
                            width: 64,
                            height: 80,
                            borderRadius: 8,
                            background: "#f5f5f5",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={item.product?.image || "https://picsum.photos/seed/my-orders/200/260"}
                            alt={item.product?.name || "상품"}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                            {item.product?.name || "상품"}
                          </p>
                          <p style={{ fontSize: 12, color: "#777", marginBottom: 1 }}>
                            카테고리: {item.product?.category || "-"}
                          </p>
                          <p style={{ fontSize: 12, color: "#777", marginBottom: 1 }}>
                            수량: {item.quantity || 0}
                          </p>
                          <p style={{ fontSize: 14, fontWeight: 600 }}>
                            ${formatPrice(item.lineTotal || 0)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      borderTop: "1px solid #f1f1f1",
                      marginTop: 4,
                      padding: "12px 20px 16px",
                    }}
                  >
                    <p style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
                      주문을 처리 중입니다. 예상 배송일: {estimateDeliveryRange(order.placedAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/order-success/${order._id}`)}
                      style={{
                        height: 40,
                        padding: "0 16px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      주문 상세보기
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyOrders;
