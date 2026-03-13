import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { formatPrice } from "@/utils/format";

// 탭에서 모든 주문 상태를 개별로 보여주기 위한 설정
// key가 Order.orderStatus 값과 동일하도록 맞춘다 (all 제외)
const STATUS_TABS = [
  { key: "all", label: "전체" },
  { key: "PENDING", label: "결제대기" },
  { key: "PAID", label: "결제완료" },
  { key: "PREPARING", label: "상품준비중" },
  { key: "SHIPPED", label: "배송중" },
  { key: "DELIVERED", label: "배송완료" },
  { key: "CANCELLED", label: "취소" },
];

const STATUS_LABEL = {
  PENDING: "결제대기",
  PAID: "결제완료",
  PREPARING: "상품준비중",
  SHIPPED: "배송중",
  DELIVERED: "배송완료",
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

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
};

function AdminOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedTab, setSelectedTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) {
        setLoading(false);
        setError("관리자 로그인이 필요합니다.");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const baseRes = await api.get("/orders", {
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
        setError("주문 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token]);

  const updateOrderStatus = async (order, payload, successMessage) => {
    if (!token) return;
    try {
      setActionLoadingId(order._id);
      const res = await api.put(`/orders/${order._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updated = res.data?.data;
      if (updated) {
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
        );
      }
      if (successMessage) {
        window.alert(successMessage);
      }
    } catch {
      window.alert("주문 상태 변경에 실패했습니다.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleSetPreparing = async (order) => {
    if (order.orderStatus === "CANCELLED") {
      window.alert("취소된 주문은 변경할 수 없습니다.");
      return;
    }
    if (!window.confirm("이 주문을 상품 준비중 상태로 변경하시겠습니까?")) return;
    await updateOrderStatus(
      order,
      {
        orderStatus: "PREPARING",
        fulfillmentStatus: "UNFULFILLED",
      },
      "상품 준비중으로 변경되었습니다."
    );
  };

  const handleStartShipping = async (order) => {
    if (["CANCELLED", "DELIVERED"].includes(order.orderStatus)) {
      window.alert("이미 완료되었거나 취소된 주문입니다.");
      return;
    }
    if (!window.confirm("이 주문의 배송을 시작하시겠습니까?")) return;

    await updateOrderStatus(
      order,
      {
        orderStatus: "SHIPPED",
        fulfillmentStatus: "PARTIAL",
      },
      "배송을 시작했습니다."
    );
  };

  const handleCancelOrder = async (order) => {
    if (order.orderStatus === "CANCELLED") {
      window.alert("이미 취소된 주문입니다.");
      return;
    }
    if (!window.confirm("이 주문을 취소하시겠습니까?")) return;

    try {
      setActionLoadingId(order._id);
      const res = await api.post(
        `/orders/${order._id}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const updated = res.data?.data;
      if (updated) {
        setOrders((prev) =>
          prev.map((o) => (o._id === order._id ? { ...o, ...updated } : o))
        );
      }
    } catch {
      window.alert("주문 취소 처리에 실패했습니다.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleSetDelivered = async (order) => {
    if (order.orderStatus === "CANCELLED") {
      window.alert("취소된 주문은 변경할 수 없습니다.");
      return;
    }
    if (order.orderStatus === "DELIVERED") {
      window.alert("이미 배송 완료된 주문입니다.");
      return;
    }
    if (!window.confirm("이 주문을 배송 완료 상태로 변경하시겠습니까?")) return;
    await updateOrderStatus(
      order,
      {
        orderStatus: "DELIVERED",
        fulfillmentStatus: "FULFILLED",
      },
      "배송 완료로 변경되었습니다."
    );
  };

  const filteredOrders = orders
    .filter((order) => {
      if (!search.trim()) return true;
      const term = search.trim().toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(term) ||
        order.buyerName?.toLowerCase().includes(term) ||
        order.buyerEmail?.toLowerCase().includes(term)
      );
    })
    .filter((order) => {
      if (selectedTab === "all") return true;
      return order.orderStatus === selectedTab;
    });

  const tabCounts = useMemo(() => {
    const base = { all: orders.length };
    STATUS_TABS.forEach((tab) => {
      if (tab.key === "all") return;
      base[tab.key] = orders.filter((o) => o.orderStatus === tab.key).length;
    });
    return base;
  }, [orders]);
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f6f6f6" }}>
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          borderBottom: "1px solid #e5e5e5",
          backgroundColor: "#fff",
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            marginRight: 12,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 20,
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>주문 관리</h1>
      </header>

      <main style={{ maxWidth: 1120, margin: "0 auto", padding: "20px 24px 40px" }}>
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 14,
            alignItems: "center",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              background: "#f5f5f5",
              borderRadius: 999,
              padding: "0 16px",
              height: 40,
            }}
          >
            <span style={{ fontSize: 16, marginRight: 8 }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="주문번호 또는 고객명으로 검색..."
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
              }}
            />
          </div>
          <button
            type="button"
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "#fff",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            필터
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
            gap: 4,
            marginBottom: 18,
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
                  height: 38,
                  borderRadius: 7,
                  border: "none",
                  fontSize: 14,
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
          <p style={{ textAlign: "center", marginTop: 40, fontSize: 14, color: "#555" }}>
            주문 목록을 불러오는 중입니다...
          </p>
        ) : error ? (
          <p style={{ textAlign: "center", marginTop: 40, fontSize: 14, color: "#c62828" }}>
            {error}
          </p>
        ) : filteredOrders.length === 0 ? (
          <p style={{ textAlign: "center", marginTop: 40, fontSize: 14, color: "#777" }}>
            조건에 맞는 주문이 없습니다.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredOrders.map((order) => {
              const label = STATUS_LABEL[order.orderStatus] || "처리중";
              const badgeStyle = STATUS_STYLE[order.orderStatus] || STATUS_STYLE.PENDING;
              const itemsCount = order.items?.length ?? 0;
              const isActing = actionLoadingId === order._id;

              return (
                <section
                  key={order._id}
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: "1px solid #ececec",
                    padding: "18px 20px",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1.6fr) minmax(0, 1.4fr) auto",
                    columnGap: 20,
                    rowGap: 8,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ marginRight: 6 }}>🕒</span>
                      <span style={{ fontWeight: 600, fontSize: 14, marginRight: 8 }}>
                        {order.orderNumber}
                      </span>
                      <span style={{ fontSize: 13, color: "#777" }}>
                        {order.buyerName} · {formatDate(order.placedAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                      <div style={{ marginBottom: 2 }}>
                        <span style={{ display: "inline-block", width: 64, color: "#999" }}>
                          고객 정보
                        </span>
                        <span>
                          {order.buyerEmail}
                          {order.buyerPhone ? ` · ${order.buyerPhone}` : ""}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: "inline-block", width: 64, color: "#999" }}>
                          주문 상품
                        </span>
                        <span>{itemsCount}개 상품</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleSetPreparing(order)}
                        disabled={isActing}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid #ddd",
                          background: "#fff",
                          fontSize: 12,
                          cursor: isActing ? "default" : "pointer",
                          opacity: isActing ? 0.7 : 1,
                        }}
                      >
                        상품 준비중
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (order.orderStatus === "CANCELLED") {
                            window.alert("취소된 주문은 변경할 수 없습니다.");
                            return;
                          }
                          if (!window.confirm("이 주문을 결제완료 상태로 변경하시겠습니까?")) return;
                          await updateOrderStatus(
                            order,
                            {
                              orderStatus: "PAID",
                            },
                            "결제 완료로 변경되었습니다."
                          );
                        }}
                        disabled={isActing}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid #0f766e",
                          background: "#0f766e",
                          color: "#fff",
                          fontSize: 12,
                          cursor: isActing ? "default" : "pointer",
                          opacity: isActing ? 0.7 : 1,
                        }}
                      >
                        결제완료
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartShipping(order)}
                        disabled={isActing}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "none",
                          background: isActing ? "#9dbcf5" : "#2563eb",
                          color: "#fff",
                          fontSize: 12,
                          cursor: isActing ? "default" : "pointer",
                        }}
                      >
                        {isActing ? "처리 중..." : "배송 시작"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(order)}
                        disabled={isActing}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid #ddd",
                          background: "#fff",
                          fontSize: 12,
                          cursor: isActing ? "default" : "pointer",
                          opacity: isActing ? 0.7 : 1,
                        }}
                      >
                        주문 취소
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDelivered(order)}
                        disabled={isActing}
                        style={{
                          padding: "7px 14px",
                          borderRadius: 8,
                          border: "1px solid #16a34a",
                          background: "#16a34a",
                          color: "#fff",
                          fontSize: 12,
                          cursor: isActing ? "default" : "pointer",
                          opacity: isActing ? 0.7 : 1,
                        }}
                      >
                        배송 완료
                      </button>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
                      <div style={{ marginBottom: 2 }}>
                        <span style={{ display: "inline-block", width: 64, color: "#999" }}>
                          배송 주소
                        </span>
                        <span>
                          {order.shippingAddress1} {order.shippingAddress2}
                        </span>
                      </div>
                      <div>
                        <span style={{ display: "inline-block", width: 64, color: "#999" }}>
                          우편번호
                        </span>
                        <span>{order.shippingZipcode}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 6,
                        ...badgeStyle,
                      }}
                    >
                      {label}
                    </span>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      ${formatPrice(order.totalAmount || 0)}
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate(`/order-success/${order._id}`)}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 999,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      👁 상세보기
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminOrders;

