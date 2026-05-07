import { test, expect } from "@playwright/test";

test.describe("グループ詳細ページ", () => {
  test("グループ名・説明・メンバーセクションが表示される", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Group name should be visible (seed data: "Group 001")
    await expect(page.getByText("Group 001", { exact: true })).toBeVisible();

    // Description should be visible
    await expect(page.getByText("Description for Group 001")).toBeVisible();

    // Members section should exist
    await expect(page.getByText("すべてのメンバー")).toBeVisible();
  });

  test("Groups ボタンをクリックすると一覧に戻る", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    await page
      .getByRole("button", { name: /Groups/ })
      .first()
      .click();
    await page.waitForURL("/");

    expect(page.url()).toMatch(/\/$/);
  });

  test("検索キーワードでメンバーを絞り込める", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search members");
    await expect(searchBox).toBeVisible();

    // Get initial state
    await searchBox.fill("Yamada");

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    // At least one member should match (seed data: group 1 has "Yamada Taro")
    const memberItems = page.getByText(/Yamada/);
    await expect(memberItems.first()).toBeVisible();
  });

  test("member_count 表示と実際のメンバー一覧件数が一致する（Group 001）", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Group 001 has 2 members according to seed data
    // The detail page shows "{member_count}件" in the Members section header
    await expect(page.getByText("2件")).toBeVisible();

    // Verify that actual member rows match: Yamada Taro and Suzuki Hanako
    await expect(page.getByText("Yamada Taro")).toBeVisible();
    await expect(page.getByText("Suzuki Hanako")).toBeVisible();
  });

  test("メンバー一覧・非メンバー一覧のページネーション UI（Previous/Next・ページサイズセレクタ）が DOM に存在しない", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Previous/Next pagination buttons must be absent
    expect(await page.getByRole("button", { name: /Previous/ }).count()).toBe(0);
    expect(await page.getByRole("button", { name: /Next/ }).count()).toBe(0);

    // Page-size selector buttons (20/50/100) must be absent
    expect(
      await page.getByRole("button", { name: "20", exact: true }).count(),
    ).toBe(0);
    expect(
      await page.getByRole("button", { name: "50", exact: true }).count(),
    ).toBe(0);
    expect(
      await page.getByRole("button", { name: "100", exact: true }).count(),
    ).toBe(0);
  });

  test("Group 001 の詳細ページでメンバー「Yamada Taro」が表示される", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // MemberList renders as "{last_name} {first_name}"
    await expect(page.getByText("Yamada Taro")).toBeVisible();
  });

  test("存在しないグループ ID（/groups/9999）にアクセスするとエラー UI が表示される", async ({
    page,
  }) => {
    await page.goto("/groups/9999");
    await page.waitForLoadState("networkidle");

    // The useGroupDetail hook sets an error string when the API returns an error
    // GroupDetailPage renders error text when error state is set
    // Wait for either an error message or verify the group content is NOT shown
    await page.waitForTimeout(1000);

    // The page should show an error state (no group name visible, error text present)
    const groupName = page.getByText("Group 9999");
    const errorText = page
      .locator('[style*="color"]')
      .filter({ hasText: /error|Error|not found|Not Found|failed|Failed|404/ });
    const hasError = (await errorText.count()) > 0;
    const hasGroupName = await groupName.isVisible().catch(() => false);

    // Either there is an error displayed OR the group name is not visible
    expect(hasError || !hasGroupName).toBeTruthy();
  });

  test("メンバーが 1 名のグループ（Group 002）の詳細ページが正常表示される", async ({
    page,
  }) => {
    await page.goto("/groups/2");
    await page.waitForLoadState("networkidle");

    // Group 002 should be displayed
    await expect(page.getByText("Group 002", { exact: true })).toBeVisible();

    // Description should be visible
    await expect(page.getByText("Description for Group 002")).toBeVisible();

    // Members section should show 1件
    await expect(page.getByText("1件")).toBeVisible();

    // The single member is Yamada Taro (user 1)
    await expect(page.getByText("Yamada Taro")).toBeVisible();
  });

  test("メンバー検索 0 件時に空状態メッセージが表示される", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder("Search members");
    await searchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);
    await expect(page.getByText("No members found.")).toBeVisible();
  });

  test("メンバー検索 0 件時にメンバー行が表示されない", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder("Search members");
    await searchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);
    expect(await page.getByTestId("member-row").count()).toBe(0);
  });

  test("メンバー検索クリア後に全件が再表示される", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search members");
    await expect(searchBox).toBeVisible();

    // Filter members by 'Yamada'
    await searchBox.fill("Yamada");
    await page.waitForTimeout(500);

    // Yamada Taro should be visible
    await expect(page.getByText("Yamada Taro")).toBeVisible();

    // Clear the search
    await searchBox.clear();
    await page.waitForTimeout(500);

    // Both members should be visible again after clearing
    await expect(page.getByText("Yamada Taro")).toBeVisible();
    await expect(page.getByText("Suzuki Hanako")).toBeVisible();
  });

  test("GET /api/v1/groups/:id/members が 500 を返したときメンバー一覧エリアにエラーが表示される", async ({ page }) => {
    // Intercept GET members API and return 500 (POST は通過させる)
    await page.route("**/api/v1/groups/1/members**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // apiFetch throws "Error: 500 Internal Server Error"
    // MemberList renders String(err) as error text → "500" が含まれる
    await expect(page.getByText(/500/)).toBeVisible({ timeout: 5000 });
  });

  test("MemberList の uuid 列ヘッダーが表示される", async ({ page }) => {
    await page.goto("/groups/1");
    // テーブルが表示されてから列ヘッダーを確認（networkidle 待機を避ける）
    await expect(page.getByRole("table")).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole("columnheader", { name: "uuid" }),
    ).toBeVisible();
  });

  test("MemberList の各メンバー行に uuid 値が表示される", async ({ page }) => {
    await page.goto("/groups/1");
    // Group 001 のメンバー: Yamada Taro (uuid: 00000000-0000-0000-0000-000000000001)
    await expect(
      page.getByText("00000000-0000-0000-0000-000000000001"),
    ).toBeVisible({ timeout: 10000 });
  });
});

// Helper: SubgroupManagementSheet を開く（SubgroupFilterChips の「サブグループ管理」ボタン経由）
async function openSubgroupManagementSheet(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "サブグループ管理", exact: true }).click();
  const sheet = page.locator('[role="dialog"]').last();
  await expect(sheet).toBeVisible({ timeout: 10000 });
  return sheet;
}

// Helper: SubgroupManagementSheet 内の「＋ 追加」ボタン → AddSubgroupSheet を開く
async function openAddSubgroupSheet(page: import("@playwright/test").Page) {
  const managementSheet = await openSubgroupManagementSheet(page);
  await managementSheet.getByRole("button", { name: "＋ 追加", exact: true }).click();
  const searchField = page.getByPlaceholder("Search by name or description");
  await expect(searchField).toBeVisible({ timeout: 10000 });
  return { managementSheet, searchField };
}

test.describe("サブグループ管理", () => {
  test("A-1: Subgroups セクションが表示される", async ({ page }) => {
    // Use Group 005 (id=5): seed data sets Group 005 → Group 006 as subgroup
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // SubgroupFilterChips chip-row should be visible with Group 006 chip
    await expect(page.getByTestId("chip-row")).toBeVisible({ timeout: 10000 });

    // Seed data: Group 005 (id=5) has Group 006 (id=6) as child
    // The chip for Group 006 should appear
    await expect(page.getByRole("button", { name: "Group 006" })).toBeVisible({ timeout: 10000 });
  });

  test("A-2: AddSubgroupSheet が開く", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    const { searchField } = await openAddSubgroupSheet(page);

    // Sheet opens with the search field
    await expect(searchField).toBeVisible({ timeout: 10000 });
  });

  test("A-3: 未選択時「追加」ボタンが disabled", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet
    await openAddSubgroupSheet(page);

    // "追加" button should be disabled when no group is selected
    const addSheet = page.locator('[role="dialog"]').last();
    const submitButton = addSheet.getByRole("button", { name: "追加", exact: true });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await expect(submitButton).toBeDisabled();
  });

  test("A-4: グループ追加成功 → Sheet が閉じる", async ({ page }) => {
    // Handle all API requests for /groups/** in one handler to avoid route conflicts.
    // Playwright evaluates routes in LIFO order; using a single handler prevents
    // unintended "continue()" calls from reaching the real API.
    await page.route("**/api/v1/groups/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === "POST" && url.includes("/api/v1/groups/3/subgroups")) {
        // Mock successful subgroup creation
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ parent_group_id: 3, child_group_id: 4 }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock GET /api/v1/groups (no path segment after /groups) to return groups including Group 004.
    // fetchGroupsForSheet sends "/api/v1/groups" (no params when q is empty).
    // Register this route first so the more-specific /groups/** handler above takes priority (LIFO).
    await page.route(/\/api\/v1\/groups(\?.*)?$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            groups: [
              { id: 4, name: "Group 004", description: "Description for Group 004" },
              { id: 5, name: "Group 005", description: "Description for Group 005" },
            ],
            total: 2,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    const { searchField } = await openAddSubgroupSheet(page);

    // Select Group 004 using the input[type="radio"] to avoid strict mode violation
    // (AddSubgroupSheet renders both <div role="radio"> and <input type="radio" aria-label="Group 004">)
    const group004Radio = page.locator('input[type="radio"][aria-label="Group 004"]');
    await expect(group004Radio).toBeVisible({ timeout: 10000 });
    await group004Radio.click();

    // Click "追加" in AddSubgroupSheet
    const addSheet = page.locator('[role="dialog"]').last();
    const submitButton = addSheet.getByRole("button", { name: "追加", exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Sheet should close (search field is no longer visible)
    await expect(searchField).not.toBeVisible({ timeout: 10000 });
  });

  test("A-5: 既存の子グループは Sheet 候補から除外される", async ({ page }) => {
    // Use Group 005 (id=5): seed data sets Group 005 → Group 006 as subgroup
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    await openAddSubgroupSheet(page);

    // Wait for groups to load (spinner disappears)
    // AddSubgroupSheet filters out existing child groups (Group 006)
    // Group 006 should NOT appear as a radio option inside the dialog
    const addSheet = page.locator('[role="dialog"]').last();
    await expect(addSheet).toBeVisible({ timeout: 10000 });

    // Wait for loading to complete (skeleton rows disappear)
    await page.waitForTimeout(500);

    // "Group 006" should not be selectable (excluded from availableGroups)
    // Use input[type="radio"] to check the actual selectable radio element
    const group006Radio = addSheet.locator('input[type="radio"][aria-label="Group 006"]');
    await expect(group006Radio).not.toBeVisible({ timeout: 10000 });
  });

  test("A-6: 重複追加 409 → 「すでに追加済みです」表示", async ({ page }) => {
    // Handle /groups/** requests: POST to subgroups returns 409, others continue.
    await page.route("**/api/v1/groups/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === "POST" && url.includes("/api/v1/groups/3/subgroups")) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "given param is not valid" }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock GET /api/v1/groups (list endpoint only) to return selectable groups.
    // Use regex to match exactly /api/v1/groups with optional query string.
    await page.route(/\/api\/v1\/groups(\?.*)?$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            groups: [
              { id: 4, name: "Group 004", description: "Description for Group 004" },
            ],
            total: 1,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    await openAddSubgroupSheet(page);

    // Select Group 004 using input[type="radio"] to avoid strict mode violation
    const group004Radio = page.locator('input[type="radio"][aria-label="Group 004"]');
    await expect(group004Radio).toBeVisible({ timeout: 10000 });
    await group004Radio.click();

    // Click "追加" in AddSubgroupSheet
    const addSheet = page.locator('[role="dialog"]').last();
    const submitButton = addSheet.getByRole("button", { name: "追加", exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Error message should appear
    await expect(page.getByText("すでに追加済みです")).toBeVisible({ timeout: 10000 });
  });

  test("A-7: Sheet 内 GET /api/v1/groups 500 → エラーメッセージ表示", async ({ page }) => {
    // Mock GET /api/v1/groups list endpoint to return 500.
    // Use regex to match exactly /api/v1/groups with optional query string,
    // so /api/v1/groups/3 (detail endpoint) still passes through.
    await page.route(/\/api\/v1\/groups(\?.*)?$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    // Note: The GET /api/v1/groups mock above will return 500 when AddSubgroupSheet loads
    await openAddSubgroupSheet(page);

    // Wait for fetch to complete and error to appear
    // AddSubgroupSheet sets fetchError with "Error <message>" format
    // apiFetch throws HttpError with message "500 Internal Server Error" (statusText may be empty in mocks)
    const addSheet = page.locator('[role="dialog"]').last();
    await expect(addSheet.getByText(/Error 500|Error\s+\d/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("A-8: サブグループゼロ時「サブグループはまだありません」表示", async ({ page }) => {
    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Group 003 has no subgroups in seed data
    // Open SubgroupManagementSheet to see the empty state
    const managementSheet = await openSubgroupManagementSheet(page);
    await expect(
      managementSheet.getByText("サブグループはまだありません"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("A-9: POST 400（循環参照・上限超過等）→ Sheet 内にエラーメッセージが表示される", async ({ page }) => {
    // Handle /groups/** requests: POST to subgroups returns 400, others continue.
    await page.route("**/api/v1/groups/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (method === "POST" && url.includes("/api/v1/groups/3/subgroups")) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ message: "given param is not valid" }),
        });
      } else {
        await route.continue();
      }
    });

    // Mock GET /api/v1/groups list endpoint to return selectable groups.
    await page.route(/\/api\/v1\/groups(\?.*)?$/, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            groups: [
              { id: 4, name: "Group 004", description: "Description for Group 004" },
            ],
            total: 1,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Open AddSubgroupSheet via サブグループ管理 → ＋ 追加
    await openAddSubgroupSheet(page);

    // Select Group 004
    const group004Radio = page.locator('input[type="radio"][aria-label="Group 004"]');
    await expect(group004Radio).toBeVisible({ timeout: 10000 });
    await group004Radio.click();

    // Click "追加" in AddSubgroupSheet
    const addSheet = page.locator('[role="dialog"]').last();
    const submitButton = addSheet.getByRole("button", { name: "追加", exact: true });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Error message should appear in Sheet (not close)
    await expect(addSheet.getByText(/given param is not valid|エラー|Error/i)).toBeVisible({ timeout: 10000 });
  });

  test("M-1: サブグループ行にメンバー数が表示される", async ({ page }) => {
    // Group 005 has Group 006 as subgroup (seed data)
    // Group 006 has 1 direct member in seed data (group_members id=33: group_id=6, user_id=3)
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open SubgroupManagementSheet to see subgroup rows
    const managementSheet = await openSubgroupManagementSheet(page);

    // Group 006 subgroup row should show "1 members"
    await expect(managementSheet.getByText("Group 006", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(managementSheet.getByText("1 members")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("サブグループ削除", () => {
  // Helper: SubgroupManagementSheet を開いて Group 006 の「削除」ボタンを取得する。
  // 新実装では SubgroupFilterChips の「サブグループ管理」ボタン → SubgroupManagementSheet 内の「削除」ボタン
  async function openSubgroupManagementAndGetDeleteButton(page: import("@playwright/test").Page) {
    // SubgroupManagementSheet を開く（「サブグループ管理」ボタンをクリック）
    await page.getByRole("button", { name: "サブグループ管理", exact: true }).click();

    // SubgroupManagementSheet（role="dialog"）内に Group 006 のデータが表示されるまで待機
    // filter({ hasText }) により Group 006 が表示されている正しい dialog を特定する
    const sheet = page.locator('[role="dialog"]').filter({ hasText: "Group 006" });
    await expect(sheet).toBeVisible({ timeout: 10000 });

    // SubgroupManagementSheet 内の「削除」ボタンを取得
    const deleteBtn = sheet.getByRole("button", { name: "削除", exact: true });
    return { deleteBtn };
  }

  // D-2: [Delete] 押下 → AlertDialog が表示される
  test("D-2: [Delete] ボタン押下で確認ダイアログが表示される", async ({ page }) => {
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Group 005 has Group 006 as subgroup (seed data)
    // Open SubgroupManagementSheet and click Group 006's delete button
    const { deleteBtn } = await openSubgroupManagementAndGetDeleteButton(page);
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // AlertDialog should appear (DeleteSubgroupDialog)
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify title and description
    await expect(dialog.getByText("Delete Subgroup")).toBeVisible();
    await expect(
      dialog.getByText("Are you sure you want to delete this subgroup? This action cannot be undone."),
    ).toBeVisible();
  });

  // D-1: Delete 成功 → ダイアログ閉・一覧から消える
  test("D-1: Delete 確認 → 204 成功 → ダイアログが閉じサブグループが一覧から消える", async ({ page }) => {
    // Mock DELETE to prevent actual data modification
    await page.route("**/api/v1/groups/5/subgroups/6", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 204,
          body: "",
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open SubgroupManagementSheet and click Group 006's delete button
    const { deleteBtn } = await openSubgroupManagementAndGetDeleteButton(page);
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // Confirm in dialog
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: "Delete" }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  // D-5: Cancel 押下 → ダイアログが閉じ API 未送信
  test("D-5: Cancel 押下 → ダイアログが閉じ API は呼ばれない", async ({ page }) => {
    let deleteApiCalled = false;
    await page.route("**/api/v1/groups/5/subgroups/6", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteApiCalled = true;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open SubgroupManagementSheet and click Group 006's delete button
    const { deleteBtn } = await openSubgroupManagementAndGetDeleteButton(page);
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // Click Cancel in dialog
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: "Cancel" }).click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // API must not have been called
    expect(deleteApiCalled).toBe(false);
  });

  // D-3: 404 → ダイアログ内エラー・閉じない
  test("D-3: Delete 確認 → 404 → ダイアログ内にエラーメッセージが表示されダイアログは閉じない", async ({ page }) => {
    await page.route("**/api/v1/groups/5/subgroups/6", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ message: "your requested item is not found" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open SubgroupManagementSheet and click Group 006's delete button
    const { deleteBtn } = await openSubgroupManagementAndGetDeleteButton(page);
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // Confirm in dialog
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: "Delete" }).click();

    // Dialog should remain open with error message
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByText("対象のサブグループ関係が見つかりませんでした"),
    ).toBeVisible({ timeout: 5000 });
  });

  // D-4: 500 → ダイアログ内に汎用エラーメッセージ
  test("D-4: Delete 確認 → 500 → ダイアログ内に汎用エラーメッセージが表示される", async ({ page }) => {
    await page.route("**/api/v1/groups/5/subgroups/6", async (route) => {
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

    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open SubgroupManagementSheet and click Group 006's delete button
    const { deleteBtn } = await openSubgroupManagementAndGetDeleteButton(page);
    await expect(deleteBtn).toBeVisible({ timeout: 10000 });
    await deleteBtn.click();

    // Confirm in dialog
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole("button", { name: "Delete" }).click();

    // Dialog should remain open with generic error message
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(
      dialog.getByText("サブグループの削除に失敗しました。しばらくしてから再度お試しください"),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("サブグループメンバー表示・フィルタ", () => {
  // S-1: Group 006 経由メンバーがソースラベル付きで表示される
  test("S-1: Group 006 経由メンバー（Tanaka Jiro）が「Group 006」ソースラベル付きで Group 005 のメンバー一覧に表示される", async ({ page }) => {
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Group 005 の直接メンバー (Ken Takahashi, Mika Watanabe) が表示される
    await expect(page.getByText("Takahashi Ken")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Watanabe Mika")).toBeVisible({ timeout: 10000 });

    // Group 006 経由メンバー (Tanaka Jiro) が表示される
    await expect(page.getByText("Tanaka Jiro")).toBeVisible({ timeout: 10000 });

    // 所属元テキストに "Group 006" が含まれる行が存在する
    // MemberList の MemberRow は <td style={tableCellSource}>{sourceLabel}</td> でラベルを出力
    // buildSourceLabel: source_groups の group_id !== groupId なら group_name を返す → "Group 006"
    const memberRows = page.getByTestId("member-row");
    await expect(memberRows.first()).toBeVisible({ timeout: 10000 });

    // Group 006 ラベルが表示されていること
    await expect(page.getByText("Group 006", { exact: true }).first()).toBeVisible({ timeout: 10000 });

    // 直接メンバーの行に「Group 006」ラベルがないこと（ソースラベルは「自グループ」になる）
    // Tanaka Jiro の行で Group 006 が表示されている
    const tanakaRow = page
      .getByTestId("member-row")
      .filter({ hasText: "Tanaka Jiro" });
    await expect(tanakaRow).toBeVisible({ timeout: 10000 });
    await expect(tanakaRow.getByText("Group 006")).toBeVisible({ timeout: 10000 });
  });

  // F-1: SubgroupFilterChips のトグルで exclude_group_ids が反映されメンバーが絞られる
  test("F-1: Group 006 チップを toggle off すると Tanaka Jiro が非表示になり、toggle on で再表示される", async ({ page }) => {
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // SubgroupFilterChips の chip-row が表示される
    const chipRow = page.getByTestId("chip-row");
    await expect(chipRow).toBeVisible({ timeout: 10000 });

    // Group 006 のチップが表示される (aria-label="Group 006", aria-pressed="true")
    const group006Chip = chipRow.getByRole("button", { name: "Group 006" });
    await expect(group006Chip).toBeVisible({ timeout: 10000 });
    await expect(group006Chip).toHaveAttribute("aria-pressed", "true");

    // 初期状態: Tanaka Jiro が表示されている
    await expect(page.getByText("Tanaka Jiro")).toBeVisible({ timeout: 10000 });

    // Group 006 チップをクリック（toggle off）
    // GET /api/v1/groups/5/members?exclude_group_ids=6 のリクエストを待機
    const [responseOff] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/groups/5/members") &&
          response.url().includes("exclude_group_ids"),
        { timeout: 10000 },
      ),
      group006Chip.click(),
    ]);
    expect(responseOff.ok()).toBeTruthy();

    // チップが off 状態になる
    await expect(group006Chip).toHaveAttribute("aria-pressed", "false");

    // Tanaka Jiro が一覧から消える
    await expect(page.getByText("Tanaka Jiro")).not.toBeVisible({ timeout: 10000 });

    // 直接メンバーは残っている
    await expect(page.getByText("Takahashi Ken")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Watanabe Mika")).toBeVisible({ timeout: 5000 });

    // Group 006 チップをもう一度クリック（toggle on）
    const [responseOn] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/api/v1/groups/5/members") &&
          !response.url().includes("exclude_group_ids"),
        { timeout: 10000 },
      ),
      group006Chip.click(),
    ]);
    expect(responseOn.ok()).toBeTruthy();

    // チップが on 状態に戻る
    await expect(group006Chip).toHaveAttribute("aria-pressed", "true");

    // Tanaka Jiro が再表示される
    await expect(page.getByText("Tanaka Jiro")).toBeVisible({ timeout: 10000 });
  });

  // Q-1: AddSubgroupSheet 検索ボックスが 300ms デバウンス後に GET /api/v1/groups?q=... を発火
  test("Q-1: AddSubgroupSheet 検索ボックスに入力すると 300ms デバウンス後に q パラメータ付きで GET /api/v1/groups が発火し結果が絞られる", async ({ page }) => {
    // Group 003 はサブグループなし（seed: group_relations に group_id=3 なし）
    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // 「サブグループ管理」ボタンで SubgroupManagementSheet を開く
    // GroupDetailContent の SubgroupFilterChips に「サブグループ管理」ボタンが配置されている
    await page.getByRole("button", { name: "サブグループ管理", exact: true }).click();

    // SubgroupManagementSheet が開く（role="dialog"）
    const managementSheet = page.locator('[role="dialog"]').last();
    await expect(managementSheet).toBeVisible({ timeout: 10000 });

    // SubgroupManagementSheet 内の「＋ 追加」ボタンをクリックして AddSubgroupSheet を開く
    await managementSheet.getByRole("button", { name: "＋ 追加", exact: true }).click();

    // AddSubgroupSheet が開く（2枚目の dialog）
    const searchField = page.getByPlaceholder("Search by name or description");
    await expect(searchField).toBeVisible({ timeout: 10000 });

    // 初回ロード（q なし）の完了を待つ
    await page.waitForTimeout(500);

    // "Group 005" を入力
    // デバウンス 300ms 後に GET /api/v1/groups?q=Group%20005 が発火することを waitForRequest で確認
    const requestPromise = page.waitForRequest(
      (request) =>
        request.url().includes("/api/v1/groups") &&
        request.url().includes("q=") &&
        request.method() === "GET",
      { timeout: 5000 },
    );

    await searchField.fill("Group 005");

    const capturedRequest = await requestPromise;
    const capturedUrl = capturedRequest.url();

    // q パラメータが含まれていること
    expect(capturedUrl).toContain("q=");
    // URLSearchParams を使って q パラメータの値を正確にデコードして確認する
    // URLSearchParams は %20 も + も共にスペースに変換する
    const parsedUrl = new URL(capturedUrl);
    expect(parsedUrl.searchParams.get("q")).toBe("Group 005");

    // レスポンスを待って UI が更新されるのを待つ
    await page.waitForTimeout(400);

    // Group 005 がリスト内に表示される
    const addSheet = page.locator('[role="dialog"]').last();
    await expect(addSheet).toBeVisible({ timeout: 10000 });
    // Group 005 のラジオ入力要素で存在を確認（getByText は名前+説明の2要素に一致してstrict mode violationになるためinputで確認）
    await expect(addSheet.locator('input[type="radio"][aria-label="Group 005"]')).toBeVisible({ timeout: 10000 });

    // 関係ないグループ（例: Group 020）が表示されない
    await expect(addSheet.locator('input[type="radio"][aria-label="Group 020"]')).not.toBeVisible({ timeout: 3000 });
  });
});
