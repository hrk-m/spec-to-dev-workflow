import { test, expect } from "@playwright/test";

// ─── 定数 ───────────────────────────────────────────────
const GROUP_1_URL = "/groups/1";
const GROUPS_API_PATTERN = "**/api/v1/groups/1";

const GROUP_1_DATA = {
  id: 1,
  name: "Group 001",
  description: "Description for Group 001",
  member_count: 2,
};

const GROUP_1_UPDATED = {
  id: 1,
  name: "Updated Group Name",
  description: "Updated description",
  member_count: 2,
};

// ─── ヘルパー ────────────────────────────────────────────

/** フルページ /groups/1 を開き、Edit ダイアログを起動する */
async function openEditDialogOnFullPage(page: import("@playwright/test").Page) {
  await page.goto(GROUP_1_URL);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByRole("dialog").getByText("Edit Group")).toBeVisible();
}

/**
 * PUT /api/v1/groups/1 を指定ステータスでモックする。
 * GET・members 等は全てパス。
 */
async function mockPut(
  page: import("@playwright/test").Page,
  status: number,
  body: object,
) {
  await page.route(GROUPS_API_PATTERN, async (route) => {
    if (route.request().url().includes("/members")) return route.continue();
    if (route.request().method() === "PUT") {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } else {
      await route.continue();
    }
  });
}

// ─── テスト ──────────────────────────────────────────────

test.describe("グループ更新", () => {
  // TC-01: フルページに [Edit] ボタンが表示される
  test("[TC-01] フルページ（/groups/1）に [Edit] ボタンが表示される", async ({
    page,
  }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  // TC-02: [Edit] クリック → ダイアログが開き、現在の name/description が初期値表示
  test(
    "[TC-02] フルページで [Edit] クリック → ダイアログが開き、現在の name/description が初期値表示",
    async ({ page }) => {
      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByLabel("Name")).toHaveValue("Group 001");
      await expect(dialog.getByLabel("Description")).toHaveValue(
        "Description for Group 001",
      );
    },
  );

  // TC-03: name/description を変更して Save → 成功 → ダイアログが閉じ、画面が更新後データで再レンダリング
  test(
    "[TC-03] name/description を変更して Save → 成功 → ダイアログが閉じ、画面が更新後データで再レンダリング",
    async ({ page }) => {
      let putCompleted = false;
      await page.route(GROUPS_API_PATTERN, async (route) => {
        if (route.request().url().includes("/members")) return route.continue();
        const method = route.request().method();
        if (method === "PUT") {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GROUP_1_UPDATED),
          });
          putCompleted = true;
        } else if (method === "GET" && putCompleted) {
          // refetch 後は更新済みデータを返す
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GROUP_1_UPDATED),
          });
        } else {
          await route.continue();
        }
      });

      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("Updated Group Name");
      await dialog.getByLabel("Description").fill("Updated description");
      await dialog.getByRole("button", { name: "Save" }).click();

      // ダイアログが閉じることを確認
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      // 更新後の name が画面に表示されることを確認
      await expect(page.getByText("Updated Group Name")).toBeVisible({
        timeout: 5000,
      });
    },
  );

  // TC-04: description を空文字にして Save → 成功（空文字可）
  test("[TC-04] description を空文字にして Save → 成功（空文字可）", async ({
    page,
  }) => {
    await mockPut(page, 200, { ...GROUP_1_DATA, description: "" });
    await openEditDialogOnFullPage(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Description").clear();
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // TC-05: シート（GroupDetailSheet）内にも [Edit] ボタンが表示される
  test(
    "[TC-05] シート（GroupDetailSheet）内にも [Edit] ボタンが表示される",
    async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const searchBox = page.getByPlaceholder("Search by name or description");
      await searchBox.fill("Group 001");
      await page.waitForTimeout(500);
      await page
        .locator('tbody tr')
        .filter({ hasText: "Group 001" })
        .first()
        .click();
      await page.waitForSelector('[role="dialog"]');

      // シート内に Edit ボタンが表示される
      const sheet = page.getByRole("dialog").first();
      await expect(sheet.getByRole("button", { name: "Edit" })).toBeVisible();
    },
  );

  // TC-06: シート内で Edit → ダイアログ → Save の更新フローが完結する
  test(
    "[TC-06] シート内で Edit → ダイアログ → Save の更新フローが完結する",
    async ({ page }) => {
      await mockPut(page, 200, GROUP_1_UPDATED);

      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const searchBox = page.getByPlaceholder("Search by name or description");
      await searchBox.fill("Group 001");
      await page.waitForTimeout(500);
      await page
        .locator('tbody tr')
        .filter({ hasText: "Group 001" })
        .first()
        .click();
      await page.waitForSelector('[role="dialog"]');

      // シート（1st dialog）内の Edit ボタンをクリック
      const sheet = page.getByRole("dialog").first();
      await sheet.getByRole("button", { name: "Edit" }).click();

      // Edit ダイアログが開くまで待つ
      const editDialog = page.getByRole("dialog", { name: "Edit Group" });
      await expect(editDialog).toBeVisible({ timeout: 5000 });

      // Edit ダイアログ内で Save
      await editDialog.getByLabel("Name").fill("Updated Group Name");
      await editDialog.getByRole("button", { name: "Save" }).click();

      // Edit ダイアログが閉じることを確認
      await expect(editDialog).not.toBeVisible({ timeout: 5000 });
    },
  );

  // TC-07: name 空で Save → "Name is required" インラインエラー、ダイアログは開いたまま
  test(
    '[TC-07] name 空で Save → "Name is required" インラインエラー表示、ダイアログは開いたまま',
    async ({ page }) => {
      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").clear();
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(dialog.getByText("Name is required")).toBeVisible();
      await expect(dialog).toBeVisible();
    },
  );

  // TC-08: name 101 文字で Save → "Name must be 100 characters or less" 表示
  test(
    '[TC-08] name 101 文字で Save → "Name must be 100 characters or less" 表示',
    async ({ page }) => {
      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Name").fill("a".repeat(101));
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(
        dialog.getByText("Name must be 100 characters or less"),
      ).toBeVisible();
    },
  );

  // TC-09: API 呼び出し中は Save ボタンが disabled
  test("[TC-09] API 呼び出し中は Save ボタンが disabled", async ({ page }) => {
    await page.route(GROUPS_API_PATTERN, async (route) => {
      if (route.request().url().includes("/members")) return route.continue();
      if (route.request().method() === "PUT") {
        // 500ms 待機して disabled 状態をアサートできる時間を確保
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(GROUP_1_DATA),
        });
      } else {
        await route.continue();
      }
    });

    await openEditDialogOnFullPage(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Save" }).click();

    // PUT が完了するまでの間、Save ボタンは disabled
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  // TC-10: Cancel ボタンでダイアログが閉じる
  test("[TC-10] Cancel ボタンでダイアログが閉じる", async ({ page }) => {
    await openEditDialogOnFullPage(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  // TC-11: PUT が 404 → ダイアログ内にエラーメッセージ表示、ダイアログは開いたまま
  test(
    "[TC-11] PUT が 404 → ダイアログ内にエラーメッセージ表示、ダイアログは開いたまま",
    async ({ page }) => {
      await mockPut(page, 404, { message: "your requested item is not found" });
      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Save" }).click();

      // ダイアログは開いたまま
      await expect(dialog).toBeVisible({ timeout: 5000 });
      // "Error: 404 Not Found" のようなエラー文言が表示される
      await expect(dialog.getByText(/404/)).toBeVisible({ timeout: 5000 });
    },
  );

  // TC-12: PUT が 500 → ダイアログ内にエラーメッセージ表示
  test(
    "[TC-12] PUT が 500 → ダイアログ内にエラーメッセージ表示",
    async ({ page }) => {
      await mockPut(page, 500, { message: "internal server error" });
      await openEditDialogOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Save" }).click();

      await expect(dialog).toBeVisible({ timeout: 5000 });
      // "Error: 500 Internal Server Error" のようなエラー文言が表示される
      await expect(dialog.getByText(/500/)).toBeVisible({ timeout: 5000 });
    },
  );
});
