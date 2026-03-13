import { memo } from "react";
import { formatPrice } from "@/utils/format";
import styles from "./ProductCard.module.css";

function ProductCard({ product, onClick }) {
  const imageSrc = product.img || product.image || "https://picsum.photos/seed/fallback/300/380";
  const discount = Number(product.discount || 0);
  const salePrice = Math.round(product.price * (1 - discount / 100));
  const brand = product.brand || "Dammi Mall";
  const isClickable = typeof onClick === "function";

  const handleKeyDown = (e) => {
    if (!isClickable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(product);
    }
  };

  return (
    <div
      className={styles.card}
      onClick={isClickable ? () => onClick(product) : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.imgWrap}>
        <img src={imageSrc} alt={product.name} className={styles.img} loading="lazy" />
        {discount > 0 && (
          <span className={styles.discountBadge}>{discount}%</span>
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.brand}>{brand}</p>
        <p className={styles.name}>{product.name}</p>
        <div className={styles.priceRow}>
          {discount > 0 ? (
            <>
              <span className={styles.originalPrice}>{formatPrice(product.price)}원</span>
              <span className={styles.salePrice}>{formatPrice(salePrice)}원</span>
            </>
          ) : (
            <span className={styles.salePrice}>{formatPrice(product.price)}원</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCard);
