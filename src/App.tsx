import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import { useVisitorTracking } from "./hooks/useVisitorTracking";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Categories from "./pages/Categories";
import ProductDetail from "./pages/ProductDetail";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Addresses from "./pages/Addresses";
import Profile from "./pages/Profile";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import AdminDashboard from "./pages/admin/Dashboard";
import OrderManagement from "./pages/admin/OrderManagement";
import ProductManagement from "./pages/admin/ProductManagement";
import ProductEditor from "./pages/admin/ProductEditor";
import CategoryManagement from "./pages/admin/CategoryManagement";
import StoreManagement from "./pages/admin/StoreManagement";
import PaymentSettings from "./pages/admin/PaymentSettings";
import UserManagement from "./pages/admin/UserManagement";
import Stores from "./pages/Stores";
import NotFound from "./pages/NotFound";

// Inner component that uses hooks requiring Router context
const AppRoutes = () => {
  // Track site visitors (excludes admin users)
  useVisitorTracking();

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/stores" element={<Stores />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/account" element={<Account />} />
      <Route path="/account/orders" element={<Orders />} />
      <Route path="/account/orders/:id" element={<OrderDetail />} />
      <Route path="/account/addresses" element={<Addresses />} />
      <Route path="/account/profile" element={<Profile />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/orders" element={<OrderManagement />} />
      <Route path="/admin/products" element={<ProductManagement />} />
      <Route path="/admin/products/:id" element={<ProductEditor />} />
      <Route path="/admin/categories" element={<CategoryManagement />} />
      <Route path="/admin/stores" element={<StoreManagement />} />
      <Route path="/admin/payment-settings" element={<PaymentSettings />} />
      <Route path="/admin/users" element={<UserManagement />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
