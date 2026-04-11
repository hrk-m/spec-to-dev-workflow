import { test, expect } from "@playwright/test";

// ─── 定数 ───────────────────────────────────────────────
const GROUP_1_URL = "/groups/1";
const GROUPS_API_PATTERN = "**/api/v1/groups/1";

// ─── ヘルパー ────────────────────────────────────────────

/**
 * DELETE /api/v1/groups/1 を指定ステータスでモックする。
 * GET・members 等は全てパス。
 */
async function mockDelete(
  page: import("@playwright/test").Page,
  status: number,
  body?: object,
  delayMs?: number,
) {
  await page.route(GROUPS_API_PATTERN, async (route) => {
    if (route.request().url().includes("/members")) return route.continue();
    if (route.request().method() === "DELETE") {
      if (delayMs) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
      if (status === 204) {
        await route.fulfill({ status: 204 });
      } else {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      }
    } else {
      await route.continue();
    }
  });
}

// ─── テスト ──────────────────────────────────────────────

test.describe("グループ削除", () => {
  // TC-01: /groups/1 に [Delete] ボタンが表示される
  test("[TC-01] /groups/1 に [Delete] ボタンが表示される", async ({ page }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  // TC-02: [Delete] クリックで確認 AlertDialog が開く
  test("[TC-02] [Delete] クリックで確認 AlertDialog が開く", async ({
    page,
  }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expect(page.getByText("Delete Group")).toBeVisible();
  });

  // TC-03: 確認ボタンクリック → DELETE API 成功 → ダイアログ閉じ → / へ遷移
  test(
    "[TC-03] 確認ボタンクリック → DELETE API 成功 → ダイアログ閉じ → / へ遷移",
    async ({ page }) => {
      await page.route(GROUPS_API_PATTERN, async (route) => {
        if (route.request().url().includes("/members")) return route.continue();
        if (route.request().method() === "DELETE") {
          await route.fulfill({ status: 204 });
        } else {
          await route.continue();
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: "Delete" }).click();

      await page.waitForURL("/");
      expect(page.url()).toMatch(/\/$/);
    },
  );

  // TC-04: Cancel クリックでダイアログが閉じる
  test("[TC-04] Cancel クリックでダイアログが閉じる", async ({ page }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  // TC-05: API 呼び出し中は確認ボタンが disabled
  test("[TC-05] API 呼び出し中は確認ボタンが disabled", async ({ page }) => {
    await mockDelete(page, 204, undefined, 500);

    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Delete" }).click();

    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Delete" }).click();

    await expect(dialog.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  // TC-06: DELETE API 404 → ダイアログ内エラー表示・ダイアログ維持
  test(
    "[TC-06] DELETE API 404 → ダイアログ内エラー表示・ダイアログ維持",
    async ({ page }) => {
      await mockDelete(page, 404, {
        message: "your requested item is not found",
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: "Delete" }).click();

      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/not found/i)).toBeVisible();
    },
  );

  // TC-07: DELETE API 500 → ダイアログ内エラー表示・ダイアログ維持
  test(
    "[TC-07] DELETE API 500 → ダイアログ内エラー表示・ダイアログ維持",
    async ({ page }) => {
      await mockDelete(page, 500, { message: "internal server error" });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Delete" }).click();

      const dialog = page.getByRole("alertdialog");
      await dialog.getByRole("button", { name: "Delete" }).click();

      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText(/internal server error/i)).toBeVisible();
    },
  );
});
