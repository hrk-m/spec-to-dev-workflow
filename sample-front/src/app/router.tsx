import { createBrowserRouter, Outlet } from "react-router";

import { SheetStackProvider } from "@/shared/lib/sheet-stack";
import { GroupNavigationLayout } from "./routes/GroupNavigationLayout";

function Layout() {
  return (
    <SheetStackProvider>
      <Outlet />
    </SheetStackProvider>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <GroupNavigationLayout />,
        children: [
          { index: true, element: <></> },
          { path: "groups", element: <></> },
          { path: "groups/:id", element: <></> },
        ],
      },
    ],
  },
]);
