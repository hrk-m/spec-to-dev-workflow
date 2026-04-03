import type { ReactNode } from "react";

/** 全ページ共通のコンテンツラッパー（全幅・左右パディングのみ） */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div style={{ width: "100%", padding: "22px 24px 44px" }}>{children}</div>;
}
