import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/api";

const CartContext = createContext(null);

const EMPTY_CART = { items: [], totalQuantity: 0, totalAmount: 0 };

export function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY_CART);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      setCart(EMPTY_CART);
      setTotalQuantity(0);
      setError("장바구니를 보려면 먼저 로그인해주세요.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.data || EMPTY_CART;
      setCart(data);
      setTotalQuantity(Number(data.totalQuantity || 0));
    } catch (_err) {
      setCart(EMPTY_CART);
      setTotalQuantity(0);
      setError("장바구니 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const resetCart = () => {
    setCart(EMPTY_CART);
    setTotalQuantity(0);
    setError("장바구니를 보려면 먼저 로그인해주세요.");
  };

  const value = {
    cart,
    totalQuantity,
    loading,
    error,
    refreshCart: fetchCart,
    resetCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart는 CartProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}

