import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { formatPrice } from "@/utils/format";
import styles from "./Admin.module.css";

const DUMMY_ORDERS = [
  { id: "ORD-20260308-001", customer: "김민수", product: "오버핏 데님 자켓", amount: 75650, status: "배송중", date: "2026-03-08" },
  { id: "ORD-20260308-002", customer: "이서연", product: "크롭 니트 가디건", amount: 36000, status: "배송완료", date: "2026-03-08" },
  { id: "ORD-20260307-003", customer: "박지훈", product: "빈티지 트렌치코트", amount: 89600, status: "준비중", date: "2026-03-07" },
  { id: "ORD-20260307-004", customer: "최유나", product: "레더 스니커즈", amount: 58500, status: "배송중", date: "2026-03-07" },
  { id: "ORD-20260306-005", customer: "정하늘", product: "미니 크로스백", amount: 35000, status: "취소", date: "2026-03-06" },
];

const ORDER_STATUS_MAP = {
  "준비중": (s) => s.statusPending,
  "배송중": (s) => s.statusShipping,
  "배송완료": (s) => s.statusDone,
  "취소": (s) => s.statusCancel,
};

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.data.data.user_type !== "admin") {
          navigate("/", { replace: true });
          return;
        }
        setUser(res.data.data);
        return api.get("/users", { headers: { Authorization: `Bearer ${token}` } });
      })
      .then((res) => {
        if (res) setUsers(res.data.data);
      })
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    try {
      await api.delete(`/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(users.filter((u) => u._id !== id));
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  if (loading) return <div className={styles.loading}>로딩 중...</div>;

  const stats = [
    { label: "총 회원수", value: `${users.length}명`, icon: "👥", color: "#ebf8ff" },
    { label: "총 매출", value: "₩2,450,000", icon: "💰", color: "#f0fdf4" },
    { label: "총 주문수", value: "128건", icon: "📦", color: "#fdf2e9" },
    { label: "신규 회원 (오늘)", value: "5명", icon: "🆕", color: "#faf5ff" },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.navLeft}>
          <h1 className={styles.logo} onClick={() => navigate("/")}>Dammi</h1>
          <span className={styles.badge}>Admin</span>
        </div>
        <div className={styles.navRight}>
          <span className={styles.greeting}>{user?.name}님</span>
          <button className={styles.backBtn} onClick={() => navigate("/")}>쇼핑몰 돌아가기</button>
        </div>
      </nav>

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>대시보드</h2>
          <p className={styles.subtitle}>쇼핑몰 운영 현황을 한눈에 확인하세요</p>
        </div>

        <div className={styles.statsGrid}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: stat.color }}>{stat.icon}</div>
              <div>
                <p className={styles.statLabel}>{stat.label}</p>
                <p className={styles.statValue}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>빠른 작업</h3>
          <div className={styles.quickActions}>
            <button className={styles.actionBtn} onClick={() => navigate("/admin/product/new")}>➕ 상품 등록</button>
            <button className={styles.actionBtn} onClick={() => navigate("/admin/orders")}>📋 주문 확인</button>
            <button className={styles.actionBtn}>👤 회원 조회</button>
            <button className={styles.actionBtn}>📊 매출 리포트</button>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>최근 주문</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>고객명</th>
                  <th>상품</th>
                  <th>금액</th>
                  <th>상태</th>
                  <th>주문일</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_ORDERS.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.orderId}>{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.product}</td>
                    <td className={styles.amount}>{formatPrice(order.amount)}원</td>
                    <td>
                      <span className={`${styles.statusBadge} ${ORDER_STATUS_MAP[order.status]?.(styles) || ""}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className={styles.dateCell}>{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            회원 관리 <span className={styles.countBadge}>{users.length}</span>
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>가입일</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`${styles.typeBadge} ${u.user_type === "admin" ? styles.adminType : styles.customerType}`}>
                        {u.user_type}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString("ko-KR")}</td>
                    <td>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(u._id)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.manageGrid}>
          <div className={styles.manageCard}>
            <div className={styles.manageIcon}>🛍️</div>
            <h4 className={styles.manageTitle}>상품 관리</h4>
            <p className={styles.manageDesc}>상품 등록, 수정, 삭제 및 재고를 관리합니다.</p>
            <button
              className={styles.manageBtn}
              onClick={() => navigate("/admin/products")}
            >
              상품 관리 바로가기
            </button>
          </div>
          <div className={styles.manageCard}>
            <div className={styles.manageIcon}>📦</div>
            <h4 className={styles.manageTitle}>주문 관리</h4>
            <p className={styles.manageDesc}>주문 현황 확인, 배송 처리 및 반품을 관리합니다.</p>
            <button
              className={styles.manageBtn}
              onClick={() => navigate("/admin/orders")}
            >
              주문 관리 바로가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin;

