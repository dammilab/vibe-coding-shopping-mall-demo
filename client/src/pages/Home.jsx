import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import api from "@/api";
import styles from "./Home.module.css";

const CATEGORIES = ["전체", "아우터", "상의", "하의", "원피스", "신발", "가방", "악세서리"];

const EVENT_BANNERS = [
  {
    key: "spring",
    id: 1,
    title: "SPRING COLLECTION",
    sub: "워싱데님·웨이브 헷모자·긴팔 T·미소매 원피스",
    bg: "#fdf2e9",
    keywords: ["워싱데님", "웨이브 헷모자", "긴팔 T", "미소매 원피스"],
  },
  {
    key: "best11",
    id: 2,
    title: "1+1 베스트 아이템",
    sub: "메리노울 운동화·선글라스",
    bg: "#eaf4fb",
    keywords: ["메리노울 운동화", "선글라스"],
  },
  {
    key: "timeDeal",
    id: 3,
    title: "타임빅딜",
    sub: "여행가방·버버리 향수 (매일 오전 11시 한정 특가)",
    bg: "#f0fdf4",
    keywords: ["여행가방", "버버리 향수"],
  },
];

const CATEGORY_ALIASES = {
  전체: ["전체"],
  아우터: ["아우터", "outer", "남성복", "여성복"],
  상의: ["상의", "top", "티셔츠", "셔츠"],
  하의: ["하의", "bottom", "팬츠", "청바지", "데님"],
  원피스: ["원피스", "dress"],
  신발: ["신발", "슈즈", "스니커즈", "운동화"],
  가방: ["가방", "백", "bag", "여행가방"],
  악세서리: ["악세서리", "악세사리", "액세서리", "accessory", "선글라스", "모자", "향수"],
};

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "");

const getProductId = (product) => String(product?._id || product?.id || "");

const NAV_FILTER_KEYWORDS = {
  best: ["가죽자켓"],
  new: ["플리즈 민소매 원피스"],
  brand: ["르무통", "라프로렌"],
  sale: ["버버리", "대마종자유"],
  event: ["여행가방", "버버리 향수"],
};

const productMatchesKeyword = (product, keyword) => {
  const haystack = normalize(`${product?.name || ""} ${product?.description || ""} ${product?.category || ""}`);
  return haystack.includes(normalize(keyword));
};

const inCategory = (product, category) => {
  if (category === "전체") return true;
  const aliases = CATEGORY_ALIASES[category] || [category];
  const categoryValue = normalize(product?.category || "");
  const textValue = normalize(`${product?.name || ""} ${product?.description || ""}`);
  return aliases.some((alias) => {
    const key = normalize(alias);
    return categoryValue.includes(key) || textValue.includes(key);
  });
};

function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeEvent, setActiveEvent] = useState("");
  const [activeNavFilter, setActiveNavFilter] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 서버에서 전체 상품 조회 (페이지네이션 모두 합쳐서)
  useEffect(() => {
    let cancelled = false;

    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        setError("");

        // 1페이지 먼저 요청
        const firstRes = await api.get("/products", { params: { page: 1 } });
        const firstData = firstRes.data?.data || [];
        const pagination = firstRes.data?.pagination;

        // 페이지네이션 정보가 없으면 그대로 사용
        if (!pagination || !pagination.totalPages || pagination.totalPages === 1) {
          if (!cancelled) setProducts(firstData);
          return;
        }

        // 2페이지 이후를 병렬로 요청
        const pages = [];
        for (let p = 2; p <= pagination.totalPages; p += 1) {
          pages.push(api.get("/products", { params: { page: p } }));
        }

        const restRes = await Promise.all(pages);
        const restData = restRes.flatMap((r) => r.data?.data || []);

        if (!cancelled) {
          setProducts([...firstData, ...restData]);
        }
      } catch (err) {
        if (!cancelled) {
          setError("상품 목록을 불러오지 못했습니다.");
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAllProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const eventProductIds = useMemo(() => {
    const result = {};

    EVENT_BANNERS.forEach((banner) => {
      const matched = products.filter((product) =>
        banner.keywords.some((keyword) => productMatchesKeyword(product, keyword))
      );
      result[banner.key] = new Set(matched.map((item) => getProductId(item)));
    });

    return result;
  }, [products]);

  useEffect(() => {
    const nextFilter = location.state?.navFilter;
    if (!nextFilter || !NAV_FILTER_KEYWORDS[nextFilter]) return;

    setActiveNavFilter(nextFilter);
    setActiveCategory("전체");
    setActiveEvent("");
    navigate(location.pathname, { replace: true });
  }, [location, navigate]);

  const filteredProducts = useMemo(() => {
    let next = products.filter((product) => inCategory(product, activeCategory));

    if (activeNavFilter) {
      const keywords = NAV_FILTER_KEYWORDS[activeNavFilter] || [];
      next = next.filter((product) =>
        keywords.some((keyword) => productMatchesKeyword(product, keyword))
      );
    }

    if (activeEvent) {
      const ids = eventProductIds[activeEvent] || new Set();
      next = next.filter((product) => ids.has(getProductId(product)));
    }

    return next;
  }, [products, activeCategory, activeEvent, activeNavFilter, eventProductIds]);

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={logout} />

      {/* 배너 */}
      <section className={styles.bannerSection}>
        {EVENT_BANNERS.map((banner) => (
          <button
            key={banner.id}
            type="button"
            className={`${styles.bannerCard} ${activeEvent === banner.key ? styles.activeBannerCard : ""}`}
            style={{ backgroundColor: banner.bg }}
            onClick={() => {
              setActiveNavFilter("");
              setActiveCategory("전체");
              setActiveEvent((prev) => (prev === banner.key ? "" : banner.key));
            }}
          >
            <p className={styles.bannerSub}>{banner.sub}</p>
            <h2 className={styles.bannerTitle}>{banner.title}</h2>
          </button>
        ))}
      </section>

      {/* 카테고리 탭 */}
      <section className={styles.categorySection}>
        <div className={styles.categoryTabs}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`${styles.categoryTab} ${activeCategory === cat ? styles.activeTab : ""}`}
              onClick={() => {
                setActiveNavFilter("");
                setActiveCategory(cat);
                setActiveEvent("");
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* 상품 그리드 */}
      <section className={styles.productSection}>
        {loading ? (
          <p className={styles.productMessage}>상품을 불러오는 중입니다...</p>
        ) : error ? (
          <p className={styles.productMessage}>{error}</p>
        ) : filteredProducts.length === 0 ? (
          <p className={styles.productMessage}>등록된 상품이 없습니다.</p>
        ) : (
          <div className={styles.productGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product._id || product.id}
                product={product}
                onClick={() => navigate(`/products/${product._id || product.id}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
