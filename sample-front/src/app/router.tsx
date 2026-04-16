import { createBrowserRouter, Outlet } from "react-router";

import { ServiceUnavailablePage } from "@/pages/service-unavailable";
import { AuthProvider } from "@/shared/auth";
import { SheetStackProvider } from "@/shared/lib/sheet-stack";
import { GroupNavigationLayout } from "./routes/GroupNavigationLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";

function Layout() {
  return (
    <AuthProvider>
      <SheetStackProvider>
        <Outlet />
      </SheetStackProvider>
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: "service-unavailable", element: <ServiceUnavailablePage /> },
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            element: <GroupNavigationLayout />,
            children: [
              { index: true, element: <></> },
              { path: "groups", element: <></> },
              { path: "groups/:id", element: <></> },
              { path: "users", element: <></> },
            ],
          },
        ],
      },
    ],
  },
]);
