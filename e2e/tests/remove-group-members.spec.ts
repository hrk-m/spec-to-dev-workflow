import { test, expect } from "@playwright/test";

// ─── 定数 ───────────────────────────────────────────────
const GROUP_1_URL = "/groups/1";
const GROUP_1_DETAIL_API = "**/api/v1/groups/1";
const GROUP_1_MEMBERS_API = "**/api/v1/groups/1/members";

// ─── テスト ──────────────────────────────────────────────

test.describe("グループメンバー削除", () => {
  // TC-01: メンバー行にチェックボックスが表示される
  test("[TC-01] メンバー行にチェックボックスが表示される", async ({ page }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await expect(page.getByText("Yamada Taro")).toBeVisible();
  });

  // TC-02: 0 件チェック → 削除ボタン disabled、1 件チェック → enabled
  test(
    "[TC-02] 0 件チェック → 削除ボタン disabled、1 件チェック → enabled になる",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      const deleteButton = page.getByRole("button", { name: "削除" });
      await expect(deleteButton).toBeDisabled();

      await page.getByRole("checkbox").first().click();

      await expect(deleteButton).toBeEnabled();
    },
  );

  // TC-03: 削除ボタン押下で確認ダイアログが表示される（選択数が文言に反映）
  test(
    "[TC-03] 削除ボタン押下で確認ダイアログが表示される（選択数が文言に反映）",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await page.getByTestId("member-checkbox").first().click();
      await page.getByRole("button", { name: "削除" }).click();

      const alertDialog = page.getByRole("alertdialog");
      await expect(alertDialog).toBeVisible();
      await expect(
        alertDialog.getByText(/選択した.*名をグループから削除しますか/),
      ).toBeVisible();
      // "選択した 1 名をグループから削除しますか？" のように "1" が含まれる
      await expect(
        alertDialog.getByText(/選択した 1 名/),
      ).toBeVisible();
    },
  );

  // TC-04: 1 件削除成功 → member_count が更新され行が減る・削除ボタンが disabled に戻る
  test(
    "[TC-04] 1 件削除成功 → member_count が更新され行が減る・削除ボタンが disabled に戻る",
    async ({ page }) => {
      // GROUP_1_MEMBERS_API を先に登録（/members を含むリクエストを優先処理）
      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        const method = route.request().method();
        if (method === "DELETE") {
          await route.fulfill({ status: 204 });
        } else if (method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              members: [{ id: 2, first_name: "Hanako", last_name: "Suzuki" }],
              total: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      // GROUP_1_DETAIL_API は /members を含まないリクエストにのみ適用
      await page.route(GROUP_1_DETAIL_API, async (route) => {
        const url = route.request().url();
        if (url.includes("/members")) {
          await route.continue();
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: 1,
              name: "Group 001",
              description: "Description for Group 001",
              member_count: 1,
            }),
          });
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await page.getByRole("checkbox").first().click();
      await page.getByRole("button", { name: "削除" }).click();

      // DELETE と再取得の両方を待機する
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

      await expect(page.getByText("1 total")).toBeVisible({ timeout: 5000 });
      // mock が Suzuki Hanako のみを返すため、Suzuki Hanako が表示されること
      await expect(page.getByText("Suzuki Hanako")).toBeVisible({ timeout: 5000 });
      // 削除後は selectedIds がクリアされるので削除ボタンは disabled に戻る
      await expect(page.getByRole("button", { name: "削除" })).toBeDisabled();
    },
  );

  // TC-05: 2 件一括削除 → member_count が 0 になる
  test(
    "[TC-05] 2 件一括削除 → member_count が 0 になる",
    async ({ page }) => {
      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        const method = route.request().method();
        if (method === "DELETE") {
          await route.fulfill({ status: 204 });
        } else if (method === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ members: [], total: 0 }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route(GROUP_1_DETAIL_API, async (route) => {
        const url = route.request().url();
        if (url.includes("/members")) {
          await route.continue();
        } else {
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
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      const checkboxes = await page.getByTestId("member-checkbox").all();
      for (const checkbox of checkboxes) {
        await checkbox.click();
      }

      await page.getByRole("button", { name: "削除" }).click();
      await expect(
        page.getByText(/選択した.*2.*名をグループから削除しますか/),
      ).toBeVisible();
      await page.getByRole("button", { name: "削除する" }).click();

      await expect(page.getByRole("alertdialog")).not.toBeVisible({
        timeout: 5000,
      });

      await expect(page.getByText("0 total")).toBeVisible({ timeout: 5000 });
    },
  );

  // TC-06: キャンセルでダイアログが閉じ、チェック状態が維持される
  test(
    "[TC-06] キャンセルでダイアログが閉じ、チェック状態が維持される",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await page.getByRole("checkbox").first().click();
      await page.getByRole("button", { name: "削除" }).click();

      await expect(page.getByRole("alertdialog")).toBeVisible();

      await page.getByRole("button", { name: "キャンセル" }).click();

      await expect(page.getByRole("alertdialog")).not.toBeVisible({
        timeout: 5000,
      });

      await expect(
        page.getByRole("button", { name: "削除" }),
      ).toBeEnabled();
    },
  );

  // TC-07: DELETE リクエストの body（user_ids）と 204 ステータスを intercept で確認する
  test(
    "[TC-07] DELETE リクエストの body（user_ids）と 204 ステータスを intercept で確認する",
    async ({ page }) => {
      let capturedRequest: { method: string; body: unknown } | null = null;

      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        if (route.request().method() === "DELETE") {
          capturedRequest = {
            method: route.request().method(),
            body: JSON.parse(route.request().postData() ?? "{}"),
          };
          await route.fulfill({ status: 204 });
        } else if (route.request().method() === "GET") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              members: [{ id: 2, first_name: "Hanako", last_name: "Suzuki" }],
              total: 1,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.route(GROUP_1_DETAIL_API, async (route) => {
        const url = route.request().url();
        if (url.includes("/members")) {
          await route.continue();
        } else {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              id: 1,
              name: "Group 001",
              description: "Description for Group 001",
              member_count: 1,
            }),
          });
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await page.getByRole("checkbox").first().click();
      await page.getByRole("button", { name: "削除" }).click();
      await page.getByRole("button", { name: "削除する" }).click();

      await expect(page.getByRole("alertdialog")).not.toBeVisible({
        timeout: 5000,
      });

      expect(capturedRequest).not.toBeNull();
      expect(capturedRequest!.method).toBe("DELETE");
      expect(
        (capturedRequest!.body as { user_ids: number[] }).user_ids,
      ).toContain(1);
    },
  );

  // TC-08: API 500 時にダイアログが閉じずエラーメッセージが表示される
  test(
    "[TC-08] API 500 時にダイアログが閉じずエラーメッセージが表示される",
    async ({ page }) => {
      await page.route(GROUP_1_MEMBERS_API, async (route) => {
        if (route.request().method() === "DELETE") {
          await route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ message: "internal server error" }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await page.getByRole("checkbox").first().click();
      await page.getByRole("button", { name: "削除" }).click();
      await page.getByRole("button", { name: "削除する" }).click();

      const alertDialog = page.getByRole("alertdialog");
      await expect(alertDialog.getByText(/500|Internal Server Error/)).toBeVisible({
        timeout: 5000,
      });
      await expect(alertDialog).toBeVisible();
    },
  );

  // TC-09: リグレッション — メンバー追加ボタンが表示され、メンバー検索が機能する
  test(
    "[TC-09] リグレッション — メンバー追加ボタンが表示され、メンバー検索が機能する",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByRole("button", { name: "メンバー追加" }),
      ).toBeVisible();

      const searchBox = page.getByPlaceholder("Search members");
      await searchBox.fill("Yamada");
      await page.waitForTimeout(500);

      await expect(page.getByText("Yamada")).toBeVisible();
    },
  );
});
