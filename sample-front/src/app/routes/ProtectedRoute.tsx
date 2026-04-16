import { useEffect, useState } from "react";
import { Navigate } from "react-router";

import { apiFetch, HttpError } from "@/shared/api";
import { useAuth } from "@/shared/auth";

type MeResponse = {
  id: number;
  uuid: string;
  first_name: string;
  last_name: string;
};

type Status = "loading" | "authenticated" | "unauthenticated" | "api_unavailable";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { setUser } = useAuth();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    apiFetch<MeResponse>("/api/v1/me")
      .then((me) => {
        setUser({
          id: me.id,
          uuid: me.uuid,
          firstName: me.first_name,
          lastName: me.last_name,
        });
        setStatus("authenticated");
      })
      .catch((err: unknown) => {
        if (err instanceof HttpError && err.status === 401) {
          setStatus("unauthenticated");
        } else {
          setStatus("api_unavailable");
        }
      });
  }, [setUser]);

  if (status === "loading") {
    return null;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/service-unavailable" replace state={{ reason: "unauthenticated" }} />;
  }

  if (status === "api_unavailable") {
    return <Navigate to="/service-unavailable" replace state={{ reason: "api_unavailable" }} />;
  }

  return <>{children}</>;
}
