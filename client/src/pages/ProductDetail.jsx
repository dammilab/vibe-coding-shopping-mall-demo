import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/api";
import { formatPrice } from "@/utils/format";
import Navbar from "@/components/Navbar";
import useAuth from "@/hooks/useAuth";
import { useCart } from "@/context/CartContext";
import styles from "./ProductDetail.module.css";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"];
const COLOR_OPTIONS = ["#6c83f7", "#111111", "#8fc4f5"];
const COLOR_LABELS = {
  "#6c83f7": "Blue",
  "#111111": "Black",
  "#8fc4f5": "Sky Blue",
};
const TAB_KEYS = {
  DESCRIPTION: "description",
  REVIEWS: "reviews",
  SHIPPING: "shipping",
};

function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, logout } = useAuth();
  const { refreshCart } = useCart();

  const [product, setProduct] = useState(null);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [selectedImage, setSelectedImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState(TAB_KEYS.DESCRIPTION);
  const [liked, setLiked] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const token = useMemo(
    () => localStorage.getItem("token") || sessionStorage.getItem("token"),
    []
  );

  useEffect(() => {
    let cancelled = false;

    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/products/${id}`);
        const nextProduct = res.data?.data || null;
        if (!nextProduct) {
          throw new Error("NOT_FOUND");
        }
        if (!cancelled) setProduct(nextProduct);
      } catch (err) {
        if (!cancelled) {
          if (err?.response?.status === 404 || err?.message === "NOT_FOUND") {
            setError("상품을 찾을 수 없습니다.");
          } else {
            setError("상품 정보를 불러오지 못했습니다.");
          }
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    const fetchWishlistState = async () => {
      if (!token || !id) return;
      try {
        const res = await api.get("/users/me/wishlist", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const wishlist = res.data?.data || [];
        const exists = wishlist.some((item) => String(item?._id || item) === String(id));
        if (!cancelled) setLiked(exists);
      } catch (_err) {
        if (!cancelled) setLiked(false);
      }
    };

    fetchWishlistState();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    let cancelled = false;

    const fetchRecommendations = async () => {
      try {
        const firstRes = await api.get("/products", { params: { page: 1 } });
        const firstData = firstRes.data?.data || [];
        const pagination = firstRes.data?.pagination;
        let allProducts = [...firstData];

        if (pagination && pagination.totalPages > 1) {
          const pages = [];
          for (let p = 2; p <= pagination.totalPages; p += 1) {
            pages.push(api.get("/products", { params: { page: p } }));
          }
          const restRes = await Promise.all(pages);
          const restData = restRes.flatMap((r) => r.data?.data || []);
          allProducts = [...allProducts, ...restData];
        }

        if (!cancelled) {
          const filtered = allProducts.filter((item) => String(item?._id || item?.id) !== String(id)).slice(0, 4);
          setRecommendedProducts(filtered);
        }
      } catch (err) {
        if (!cancelled) setRecommendedProducts([]);
      }
    };

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const discount = Number.isFinite(Number(product?.discount)) ? Number(product?.discount) : 26;
  const originPrice = Number(product?.price || 0);
  const salePrice = useMemo(() => Math.round(originPrice * (1 - discount / 100)), [originPrice, discount]);
  const stockLeft = Number.isFinite(Number(product?.stock)) ? Number(product?.stock) : 5;
  const rating = Number.isFinite(Number(product?.rating)) ? Number(product?.rating) : 4.8;
  const reviewCount = Number.isFinite(Number(product?.reviewCount)) ? Number(product?.reviewCount) : 124;
  const productImages = useMemo(() => {
    const baseImage = product?.image || product?.img || "https://picsum.photos/seed/product-detail/800/1000";
    const extraImages = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    const placeholders = [
      `https://picsum.photos/seed/${id}-thumb-1/400/500`,
      `https://picsum.photos/seed/${id}-thumb-2/400/500`,
      `https://picsum.photos/seed/${id}-thumb-3/400/500`,
    ];
    const merged = [baseImage, ...extraImages, ...placeholders];
    return merged.slice(0, 4);
  }, [id, product]);

  const increaseQty = () => setQuantity((prev) => prev + 1);
  const decreaseQty = () => setQuantity((prev) => Math.max(1, prev - 1));
  const toggleLike = async () => {
    if (!token) {
      setActionMessage("찜 기능은 로그인 후 사용할 수 있습니다.");
      return;
    }
    try {
      if (liked) {
        await api.delete(`/users/me/wishlist/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLiked(false);
        setActionMessage("위시리스트에서 제거되었습니다.");
      } else {
        await api.post(
          "/users/me/wishlist",
          { productId: id },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setLiked(true);
        setActionMessage("위시리스트에 추가되었습니다.");
      }
    } catch (_err) {
      setActionMessage("요청 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (productImages.length > 0) {
      setSelectedImage(productImages[0]);
    }
  }, [productImages]);

  useEffect(() => {
    setSelectedSize("M");
    setSelectedColor(COLOR_OPTIONS[0]);
    setQuantity(1);
    setActiveTab(TAB_KEYS.DESCRIPTION);
    setLiked(false);
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name || "상품 상세", url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      // 사용자 취소/브라우저 제한은 무시
    }
  };

  const handleAddToBag = async () => {
    if (!token) {
      setActionMessage("장바구니 기능은 로그인 후 사용할 수 있습니다.");
      return;
    }
    try {
      await api.post(
        "/cart",
        {
          productId: id,
          quantity,
          size: selectedSize,
          color: selectedColor,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await refreshCart();
      setActionMessage("장바구니에 담았습니다.");
      const colorLabel = COLOR_LABELS[selectedColor] || selectedColor;
      const alertMessage = [
        "장바구니에 추가되었습니다!",
        `상품: ${product.name}`,
        `사이즈: ${selectedSize}`,
        `색상: ${colorLabel}`,
        `수량: ${quantity}`,
      ].join("\n");
      window.alert(alertMessage);
    } catch (_err) {
      setActionMessage("장바구니 추가 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Navbar user={user} onLogout={logout} />
        <div className={styles.message}>상품 정보를 불러오는 중입니다...</div>;
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.page}>
        <Navbar user={user} onLogout={logout} />
        <div className={styles.messageWrap}>
          <p className={styles.message}>{error || "상품을 찾을 수 없습니다."}</p>
          <button type="button" className={styles.backBtn} onClick={() => navigate("/")}>
            홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Navbar user={user} onLogout={logout} />
      <header className={styles.topBar}>
        <button type="button" className={styles.iconBtn} onClick={() => navigate("/")}>
          BACK
        </button>
        <h1 className={styles.topTitle}>{product.name}</h1>
        <div className={styles.topActions}>
          <button type="button" className={styles.iconBtn} onClick={handleShare}>SHARE</button>
          <button type="button" className={styles.iconBtn} onClick={toggleLike}>
            {liked ? "LIKED" : "WISH"}
          </button>
        </div>
      </header>

      <main className={styles.container}>
        <section className={styles.imageSection}>
          <div className={styles.mainImageWrap}>
            <img src={selectedImage} alt={product.name} className={styles.mainImage} />
          </div>
          <div className={styles.thumbRow}>
            {productImages.map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                className={`${styles.thumbBtn} ${selectedImage === img ? styles.activeThumb : ""}`}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt={`${product.name} thumbnail ${index + 1}`} className={styles.thumbImg} />
              </button>
            ))}
          </div>
        </section>

        <section className={styles.infoSection}>
          <div className={styles.badges}>
            <span className={styles.newBadge}>NEW</span>
            <span className={styles.saleBadge}>SALE</span>
          </div>

          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.rating}>* {rating.toFixed(1)} ({reviewCount} reviews)</p>

          <div className={styles.priceRow}>
            <strong className={styles.salePrice}>₩{formatPrice(salePrice)}</strong>
            <span className={styles.originPrice}>₩{formatPrice(originPrice)}</span>
            <span className={styles.percentBadge}>{discount}% OFF</span>
          </div>

          <div className={styles.divider} />

          <div className={styles.block}>
            <p className={styles.blockTitle}>Size</p>
            <div className={styles.sizeRow}>
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`${styles.sizeBtn} ${selectedSize === size ? styles.activeBtn : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <p className={styles.blockTitle}>Color</p>
            <div className={styles.colorRow}>
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  className={`${styles.colorBtn} ${selectedColor === color ? styles.activeColor : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className={styles.block}>
            <p className={styles.blockTitle}>Quantity</p>
            <div className={styles.qtyRow}>
              <div className={styles.qtyBox}>
                <button type="button" className={styles.qtyBtn} onClick={decreaseQty}>-</button>
                <span className={styles.qtyValue}>{quantity}</span>
                <button type="button" className={styles.qtyBtn} onClick={increaseQty}>+</button>
              </div>
              <span className={styles.stockText}>재고 {stockLeft}개 남음</span>
            </div>
          </div>

          <button type="button" className={styles.addBagBtn} onClick={handleAddToBag}>
            장바구니 담기 - ₩{formatPrice(salePrice * quantity)}
          </button>
          <button type="button" className={styles.wishlistBtn} onClick={toggleLike}>
            {liked ? "REMOVE FROM WISHLIST" : "ADD TO WISHLIST"}
          </button>
          {actionMessage ? <p className={styles.actionMessage}>{actionMessage}</p> : null}

          <div className={styles.benefitGrid}>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>TR</span>
              <p className={styles.benefitTitle}>Free Shipping</p>
            </div>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>RT</span>
              <p className={styles.benefitTitle}>Easy Returns</p>
            </div>
            <div className={styles.benefitCard}>
              <span className={styles.benefitIcon}>SC</span>
              <p className={styles.benefitTitle}>Secure Payment</p>
            </div>
          </div>

          <div className={styles.tabMenu}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === TAB_KEYS.DESCRIPTION ? styles.activeTabBtn : ""}`}
              onClick={() => setActiveTab(TAB_KEYS.DESCRIPTION)}
            >
              Description
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === TAB_KEYS.REVIEWS ? styles.activeTabBtn : ""}`}
              onClick={() => setActiveTab(TAB_KEYS.REVIEWS)}
            >
              Reviews
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === TAB_KEYS.SHIPPING ? styles.activeTabBtn : ""}`}
              onClick={() => setActiveTab(TAB_KEYS.SHIPPING)}
            >
              Shipping & Returns
            </button>
          </div>

          <div className={styles.tabPanel}>
            {activeTab === TAB_KEYS.DESCRIPTION && (
              <div>
                <p className={styles.tabText}>
                  {product.description || "베이직한 실루엣에 포인트 디테일을 더해 데일리로 활용하기 좋은 상품입니다."}
                </p>
                <ul className={styles.featureList}>
                  <li>Soft and comfortable fabric for daily wear</li>
                  <li>Modern fit designed for layered styling</li>
                  <li>Recommended for all-season casual looks</li>
                </ul>
              </div>
            )}
            {activeTab === TAB_KEYS.REVIEWS && (
              <div>
                <p className={styles.tabText}>실제 구매자 기준 평균 평점 {rating.toFixed(1)} / 5.0 입니다.</p>
                <p className={styles.tabSubText}>리뷰 {reviewCount}개가 등록되어 있습니다.</p>
              </div>
            )}
            {activeTab === TAB_KEYS.SHIPPING && (
              <div>
                <p className={styles.tabText}>50,000원 이상 구매 시 무료 배송됩니다.</p>
                <p className={styles.tabSubText}>수령 후 7일 이내 교환/반품 접수가 가능합니다.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <section className={styles.recommendSection}>
        <h3 className={styles.recommendTitle}>You might also like</h3>
        {recommendedProducts.length === 0 ? (
          <p className={styles.recommendEmpty}>추천 상품이 없습니다.</p>
        ) : (
          <div className={styles.recommendGrid}>
            {recommendedProducts.map((item) => {
              const itemId = item?._id || item?.id;
              const itemImage = item?.image || item?.img || "https://picsum.photos/seed/recommend/300/380";
              const itemDiscount = Number.isFinite(Number(item?.discount)) ? Number(item.discount) : 15;
              const itemSalePrice = Math.round(Number(item?.price || 0) * (1 - itemDiscount / 100));
              return (
                <button
                  key={itemId}
                  type="button"
                  className={styles.recommendCard}
                  onClick={() => navigate(`/products/${itemId}`)}
                >
                  <img src={itemImage} alt={item?.name || "추천 상품"} className={styles.recommendImage} />
                  <p className={styles.recommendName}>{item?.name}</p>
                  <p className={styles.recommendPrice}>₩{formatPrice(itemSalePrice)}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProductDetail;
