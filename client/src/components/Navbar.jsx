import { useState, useRef, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import styles from "./Navbar.module.css";

const NAV_ITEMS = [
  { key: "best", label: "베스트" },
  { key: "new", label: "신상품" },
  { key: "brand", label: "브랜드" },
  { key: "sale", label: "세일" },
  { key: "event", label: "이벤트" },
];

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();
  const { totalQuantity, resetCart } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    resetCart();
    onLogout();
    navigate("/login");
  };

  const handleMyOrders = () => {
    setDropdownOpen(false);
    navigate("/orders");
  };

  const handleTopMenuClick = (key) => {
    navigate("/", {
      state: { navFilter: key },
    });
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navInner}>
        <div className={styles.navLeft}>
          <h1 className={styles.logo} onClick={() => navigate("/")}>Dammi</h1>
          <ul className={styles.navLinks}>
            {NAV_ITEMS.map((item) => (
              <li
                key={item.key}
                className={styles.linkEnabled}
                onClick={() => handleTopMenuClick(item.key)}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.navRight}>
          <button
            type="button"
            className={styles.cartButton}
            onClick={() => navigate(user ? "/cart" : "/login")}
          >
            <span className={styles.cartIcon}>🛒</span>
            <span className={styles.cartBadge}>{totalQuantity}</span>
          </button>

          <div className={styles.searchBox}>
            <input
              type="text"
              placeholder="상품을 검색해보세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <span className={styles.searchIcon}>🔍</span>
          </div>

          {user ? (
            <>
              {user.user_type === "admin" && (
                <button className={styles.adminBtn} onClick={() => navigate("/admin")}>어드민</button>
              )}
              <div ref={dropdownRef} className={styles.userMenu}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={styles.userBtn}
                >
                  {user.name}님 환영합니다!
                </button>
                {dropdownOpen && (
                  <div className={styles.dropdown}>
                    <button
                      type="button"
                      className={styles.dropdownItem}
                      onClick={handleMyOrders}
                    >
                      내 주문목록
                    </button>
                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.logoutItem}`}
                      onClick={handleLogout}
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className={styles.loginBtn} onClick={() => navigate("/login")}>로그인</button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default memo(Navbar);
