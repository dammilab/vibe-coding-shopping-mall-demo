import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";

function OrderFailure() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const search = useLocation().search;
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const reason = params.get("reason");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fef2f2" }}>
      <Navbar user={user} onLogout={logout} />
      <main
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "32px 16px 48px",
        }}
      >
        <section
          style={{
            maxWidth: 600,
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
                backgroundColor: "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <span style={{ fontSize: 32, color: "#dc2626" }}>!</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              주문 처리에 실패했습니다.
            </h1>
            <p style={{ fontSize: 14, color: "#555", marginBottom: 2 }}>
              결제가 정상적으로 완료되지 않았습니다.
            </p>
            <p style={{ fontSize: 13, color: "#777" }}>
              아래 내용을 확인한 뒤 다시 시도해 주세요.
            </p>
          </div>

          {reason ? (
            <p
              style={{
                marginTop: 8,
                padding: 12,
                borderRadius: 8,
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                fontSize: 13,
                color: "#991b1b",
              }}
            >
              사유: {reason}
            </p>
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
              onClick={() => navigate("/cart")}
              style={{
                padding: "8px 14px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              장바구니로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => navigate("/checkout")}
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
              다시 결제 시도하기
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default OrderFailure;

