import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { formatPrice } from "@/utils/format";
import styles from "./ProductManage.module.css";

function ProductManage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 4,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);

    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.data.data.user_type !== "admin") {
          navigate("/", { replace: true });
          return null;
        }
        return api.get("/products", { params: { page } });
      })
      .then((res) => {
        if (res) {
          setProducts(res.data.data || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      })
      .catch(() => navigate("/login", { replace: true }))
      .finally(() => setLoading(false));
  }, [navigate, page]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(keyword.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>로딩 중...</div>;

  const startIndex =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const endIndex = startIndex + filtered.length - 1;

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <button className={styles.backIcon} onClick={() => navigate("/admin")}>←</button>
        <h1 className={styles.title}>상품 관리</h1>
        <button
          className={styles.newBtn}
          onClick={() => navigate("/admin/product/new")}
        >
          + 새 상품 등록
        </button>
      </nav>

      <div className={styles.container}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${styles.tabActive}`}>상품 목록</button>
          <button
            className={styles.tab}
            onClick={() => navigate("/admin/product/new")}
          >
            상품 등록
          </button>
        </div>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            placeholder="상품명으로 검색..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button className={styles.filterBtn}>필터</button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이미지</th>
                <th>상품명</th>
                <th>카테고리</th>
                <th>가격</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id}>
                  <td>
                    <div className={styles.thumb}>
                      {p.image ? (
                        <img src={p.image} alt={p.name} />
                      ) : (
                        <div className={styles.thumbPlaceholder} />
                      )}
                    </div>
                  </td>
                  <td className={styles.nameCell}>{p.name}</td>
                  <td>{p.category}</td>
                  <td className={styles.priceCell}>{formatPrice(p.price)}원</td>
                  <td>
                    <div className={styles.actionGroup}>
                      <button className={styles.iconBtn} title="수정">✏️</button>
                      <button className={styles.iconBtn} title="삭제">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.empty}>
                    등록된 상품이 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationRow}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            ← 이전
          </button>

          <div className={styles.pageNumberGroup}>
            {Array.from({ length: pagination.totalPages || 1 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`${styles.pageBtn} ${
                  num === pagination.page ? styles.pageBtnActive : ""
                }`}
                onClick={() => setPage(num)}
              >
                {num}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === pagination.totalPages || pagination.totalPages === 0}
            onClick={() =>
              setPage((prev) =>
                Math.min(pagination.totalPages || 1, prev + 1)
              )
            }
          >
            다음 →
          </button>
        </div>

        {pagination.total > 0 && (
          <p className={styles.pageInfo}>
            전체 {pagination.total}개 상품 중 {startIndex}–{endIndex}개 표시
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductManage;

