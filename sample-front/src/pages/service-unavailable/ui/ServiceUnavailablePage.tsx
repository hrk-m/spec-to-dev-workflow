import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { apiFetch } from "@/shared/api";

type Status = "loading" | "redirect" | "error";

export function ServiceUnavailablePage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    apiFetch("/api/v1/me")
      .then(() => {
        setStatus("redirect");
      })
      .catch(() => {
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    if (status === "redirect") {
      void navigate("/", { replace: true });
    }
  }, [status, navigate]);

  if (status === "loading" || status === "redirect") {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1c1c1e",
            margin: "0 0 16px",
            letterSpacing: "-0.5px",
          }}
        >
          ただいまメンテナンス中です。
        </h1>

        <p
          style={{
            fontSize: "17px",
            lineHeight: 1.6,
            color: "#3c3c43",
            margin: 0,
          }}
        >
          ご迷惑をおかけし申し訳ありません。しばらくしてから再度アクセスしてください。
        </p>
      </div>
    </div>
  );
}
