import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from "react-router-dom";
import AdminLayout from "@/layouts/AdminLayout";

// Customer and admin bundles are split so a scanned QR loads only the menu code.
const MenuPage = lazy(() => import("@/pages/customer/MenuPage"));
const CheckoutPage = lazy(() => import("@/pages/customer/CheckoutPage"));
const OrderStatusPage = lazy(() => import("@/pages/customer/OrderStatusPage"));
const BillPage = lazy(() => import("@/pages/customer/BillPage"));

const LoginPage = lazy(() => import("@/pages/admin/LoginPage"));
const HomePage = lazy(() => import("@/pages/admin/HomePage"));
const OrdersPage = lazy(() => import("@/pages/admin/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/admin/OrderDetailPage"));
const AdminMenuPage = lazy(() => import("@/pages/admin/MenuPage"));
const ProductFormPage = lazy(() => import("@/pages/admin/ProductFormPage"));
const CategoriesPage = lazy(() => import("@/pages/admin/CategoriesPage"));
const TablesPage = lazy(() => import("@/pages/admin/TablesPage"));
const TableQrPage = lazy(() => import("@/pages/admin/TableQrPage"));
const TableDetailPage = lazy(() => import("@/pages/admin/TableDetailPage"));
const BillsPage = lazy(() => import("@/pages/admin/BillsPage"));
const BillDetailPage = lazy(() => import("@/pages/admin/BillDetailPage"));
const IngredientsPage = lazy(() => import("@/pages/admin/IngredientsPage"));
const SettingsPage = lazy(() => import("@/pages/admin/SettingsPage"));
const ProfilePage = lazy(() => import("@/pages/admin/ProfilePage"));
const RestaurantSettingsPage = lazy(() => import("@/pages/admin/RestaurantSettingsPage"));

function PageFallback() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" aria-busy>
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
    </div>
  );
}

function Root() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ScrollRestoration />
      <Outlet />
    </Suspense>
  );
}

function AdminOutlet() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Outlet />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: "/", element: <Navigate to="/admin" replace /> },
      { path: "/menu/:restaurantSlug/:qrToken", element: <MenuPage /> },
      { path: "/menu/:restaurantSlug/:qrToken/checkout", element: <CheckoutPage /> },
      { path: "/menu/:restaurantSlug/:qrToken/orders/:publicId", element: <OrderStatusPage /> },
      { path: "/menu/:restaurantSlug/:qrToken/bill", element: <BillPage /> },
      { path: "/admin/login", element: <LoginPage /> },
      {
        path: "/admin",
        element: <AdminLayout />,
        children: [
          {
            element: <AdminOutlet />,
            children: [
              { index: true, element: <HomePage /> },
              { path: "orders", element: <OrdersPage /> },
              { path: "orders/:id", element: <OrderDetailPage /> },
              { path: "menu", element: <AdminMenuPage /> },
              { path: "products", element: <Navigate to="/admin/menu" replace /> },
              { path: "products/new", element: <ProductFormPage /> },
              { path: "products/:id/edit", element: <ProductFormPage /> },
              { path: "categories", element: <CategoriesPage /> },
              { path: "ingredients", element: <IngredientsPage /> },
              { path: "tables", element: <TablesPage /> },
              { path: "tables/:id", element: <TableDetailPage /> },
              { path: "tables/:id/qr", element: <TableQrPage /> },
              { path: "bills", element: <BillsPage /> },
              { path: "bills/:id", element: <BillDetailPage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "settings/profile", element: <ProfilePage /> },
              { path: "settings/restaurant", element: <RestaurantSettingsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <Navigate to="/admin" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
