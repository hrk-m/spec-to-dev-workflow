import { describe, expect, it } from "vitest";

import { API_BASE_URL } from "@/shared/config";

describe("shared/config/env", () => {
  it("API_BASE_URL は空文字列（同一オリジンプロキシ）", () => {
    expect(API_BASE_URL).toBe("");
  });
});
