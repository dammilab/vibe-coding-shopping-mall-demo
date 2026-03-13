import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import Admin from "@/pages/admin/Admin";
import NewProduct from "@/pages/admin/NewProduct";
import ProductManage from "@/pages/admin/ProductManage";
import AdminOrders from "@/pages/admin/AdminOrders";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import OrderSuccess from "@/pages/OrderSuccess";
import OrderFailure from "@/pages/OrderFailure";
import MyOrders from "@/pages/MyOrders";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/product/new" element={<NewProduct />} />
        <Route path="/admin/products" element={<ProductManage />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:id" element={<OrderSuccess />} />
        <Route path="/order-failure" element={<OrderFailure />} />
        <Route path="/orders" element={<MyOrders />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
