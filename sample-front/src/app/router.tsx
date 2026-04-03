import { createBrowserRouter } from "react-router";

import { GroupDetailPage } from "@/pages/group-detail";
import { HomePage } from "@/pages/home";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/groups",
    element: <HomePage />,
  },
  {
    path: "/groups/:id",
    element: <GroupDetailPage />,
  },
]);
