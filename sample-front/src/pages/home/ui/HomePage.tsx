import { useEffect, useState } from "react";

import { apiFetch } from "@/shared/api/client";

export function HomePage() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ message: string }>("/hello")
      .then((data) => setMessage(data.message))
      .catch((err: unknown) => setError(String(err)));
  }, []);

  return (
    <div className="app">
      <h1>sample-front</h1>
      {error && <p style={{ color: "salmon" }}>{error}</p>}
      {!error && <p>{message ?? "loading..."}</p>}
    </div>
  );
}
