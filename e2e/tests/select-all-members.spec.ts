import { test, expect } from "@playwright/test";

// ─── 定数 ───────────────────────────────────────────────
const GROUP_1_URL = "/groups/1";
// members を含む URL にマッチ（クエリパラメータは無視）
const GROUP_1_MEMBERS_API = /\/api\/v1\/groups\/1\/members(\?.*)?$/;
// members を含まない groups/1 の URL にのみマッチ
const GROUP_1_DETAIL_API = /\/api\/v1\/groups\/1(\?.*)?$/;

// ─── テスト ──────────────────────────────────────────────

test.describe("全選択ヘッダーチェックボックス", () => {
  // TC-01: ヘッダー checkbox クリック → 全メンバー選択 → 削除ボタン有効化
  test(
    "[TC-01] ヘッダー checkbox クリック → 全メンバー選択 → 削除ボタン有効化",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Yamada Taro")).toBeVisible();
      await expect(page.getByTestId("header-checkbox")).toBeVisible();
      await expect(page.getByRole("button", { name: "削除" })).toBeDisabled();

      await page.getByTestId("header-checkbox").click();

      await expect(page.getByRole("button", { name: "削除" })).toBeEnabled();

      const memberCheckboxes = await page.getByTestId("member-checkbox").all();
      for (const checkbox of memberCheckboxes) {
        await expect(checkbox).toHaveAttribute("aria-checked", "true");
      }
    },
  );

  // TC-02: 一部選択時 → ヘッダー checkbox が indeterminate 表示
  test(
    "[TC-02] 一部選択時 → ヘッダー checkbox が indeterminate 表示",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Yamada Taro")).toBeVisible();

      await page.getByTestId("member-checkbox").first().click();

      const isIndeterminate = await page
        .getByTestId("header-checkbox")
        .evaluate((el: HTMLInputElement) => el.indeterminate);
      expect(isIndeterminate).toBe(true);

      await expect(page.getByTestId("header-checkbox")).not.toBeChecked();
    },
  );

  // TC-03: 全選択 → ヘッダークリック → 全解除 → 削除ボタン disabled
  test(
    "[TC-03] 全選択 → ヘッダークリック → 全解除 → 削除ボタン disabled",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Yamada Taro")).toBeVisible();

      await page.getByTestId("header-checkbox").click();
      await expect(page.getByRole("button", { name: "削除" })).toBeEnabled();

      await page.getByTestId("header-checkbox").click();
      await expect(page.getByRole("button", { name: "削除" })).toBeDisabled();

      const memberCheckboxes = await page.getByTestId("member-checkbox").all();
      for (const checkbox of memberCheckboxes) {
        await expect(checkbox).toHaveAttribute("aria-checked", "false");
      }
    },
  );

  // TC-04: メンバー 0 件 → ヘッダー checkbox が disabled
  test(
    "[TC-04] メンバー 0 件 → ヘッダー checkbox が disabled",
    async ({ page }) => {
      await page.route(GROUP_1_DETAIL_API, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            name: "Group 001",
            description: "Description for Group 001",
            member_count: 0,
          }),
        });
      });

      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ members: [], total: 0 }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("No members found.")).toBeVisible();
      await expect(page.getByTestId("header-checkbox")).toBeDisabled();
    },
  );

  // TC-05: 全選択 → 全件削除成功 → ヘッダーが未選択にリセット
  test(
    "[TC-05] 全選択 → 全件削除成功 → ヘッダーが未選択にリセット",
    async ({ page }) => {
      let deleteDone = false;

      await page.route(GROUP_1_DETAIL_API, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 1,
            name: "Group 001",
            description: "Description for Group 001",
            member_count: 0,
          }),
        });
      });

      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        const method = route.request().method();
        if (method === "DELETE") {
          deleteDone = true;
          await route.fulfill({ status: 204 });
        } else if (method === "GET") {
          if (deleteDone) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ members: [], total: 0 }),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                members: [
                  { id: 1, first_name: "Taro", last_name: "Yamada" },
                  { id: 2, first_name: "Hanako", last_name: "Suzuki" },
                ],
                total: 2,
              }),
            });
          }
        } else {
          await route.continue();
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(page.getByText("Yamada Taro")).toBeVisible();

      await page.getByTestId("header-checkbox").click();

      await page.getByRole("button", { name: "削除" }).click();

      const [deleteResponse] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/v1/groups/1/members") &&
            resp.request().method() === "DELETE",
        ),
        page.getByRole("button", { name: "削除する" }).click(),
      ]);
      expect(deleteResponse.status()).toBe(204);

      await expect(page.getByRole("alertdialog")).not.toBeVisible({
        timeout: 5000,
      });

      await expect(page.getByText("No members found.")).toBeVisible({
        timeout: 5000,
      });

      await expect(page.getByTestId("header-checkbox")).toBeDisabled();
      await expect(page.getByTestId("header-checkbox")).not.toBeChecked();
    },
  );
});
