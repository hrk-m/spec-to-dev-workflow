export const API_BASE_URL =
  // BUN_PUBLIC_API_URL=http://... を .env に設定することで上書き可能
  import.meta.env?.BUN_PUBLIC_API_URL || "http://localhost:8080";
