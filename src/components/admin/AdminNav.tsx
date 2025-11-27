import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, FolderTree, Store, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminNav = () => {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Orders", path: "/admin/orders", icon: ShoppingCart },
    { name: "Products", path: "/admin/products", icon: Package },
    { name: "Categories", path: "/admin/categories", icon: FolderTree },
    { name: "Stores", path: "/admin/stores", icon: Store },
    { name: "Payment Settings", path: "/admin/payment-settings", icon: CreditCard },
  ];

  return (
    <nav className="bg-muted/50 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap",
                  "border-b-2 border-transparent hover:border-primary/50 hover:text-primary",
                  isActive && "border-primary text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AdminNav;
