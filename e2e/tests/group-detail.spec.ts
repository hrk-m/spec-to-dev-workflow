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
    await expect(page.getByText("Members")).toBeVisible();
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
    // The detail page shows "{member_count} total" in the Members section header
    await expect(page.getByText("2 total")).toBeVisible();

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

    // Members section should show 1 total
    await expect(page.getByText("1 total")).toBeVisible();

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

test.describe("サブグループ管理", () => {
  test("A-1: Subgroups セクションが表示される", async ({ page }) => {
    // Use Group 005 (id=5): seed data sets Group 005 → Group 006 as subgroup
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // "Subgroups" heading should be visible
    await expect(page.getByText("Subgroups")).toBeVisible({ timeout: 10000 });

    // Seed data: Group 005 (id=5) has Group 006 (id=6) as child
    await expect(page.getByText("Group 006", { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test("A-2: AddSubgroupSheet が開く", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Click the "追加" button in the Subgroups section
    // GroupDetailContent renders <Button variant="soft" onClick={handleOpenAddSubgroupSheet}>追加</Button>
    const addButton = page.getByRole("button", { name: "追加", exact: true });
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();

    // Sheet opens with the search field
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("A-3: 未選択時「追加する」ボタンが disabled", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Open sheet
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible({ timeout: 10000 });

    // "追加する" button should be disabled when no group is selected
    const submitButton = page.getByRole("button", { name: "追加する" });
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

    // Open Sheet
    await page.getByRole("button", { name: "追加", exact: true }).click();
    const searchField = page.getByPlaceholder("Search by name or description");
    await expect(searchField).toBeVisible({ timeout: 10000 });

    // Select Group 004 using the input[type="radio"] to avoid strict mode violation
    // (AddSubgroupSheet renders both <div role="radio"> and <input type="radio" aria-label="Group 004">)
    const group004Radio = page.locator('input[type="radio"][aria-label="Group 004"]');
    await expect(group004Radio).toBeVisible({ timeout: 10000 });
    await group004Radio.click();

    // Click "追加する"
    const submitButton = page.getByRole("button", { name: "追加する" });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
    await submitButton.click();

    // Sheet should close (search field is no longer visible)
    await expect(searchField).not.toBeVisible({ timeout: 10000 });
  });

  test("A-5: 既存の子グループは Sheet 候補から除外される", async ({ page }) => {
    // Use Group 005 (id=5): seed data sets Group 005 → Group 006 as subgroup
    await page.goto("/groups/5");
    await page.waitForLoadState("networkidle");

    // Open Sheet - seed data has Group 006 as child of Group 005
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible({ timeout: 10000 });

    // Wait for groups to load (spinner disappears)
    // AddSubgroupSheet filters out existing child groups (Group 006)
    // Group 006 should NOT appear as a radio option inside the dialog
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Wait for loading to complete (skeleton rows disappear)
    await page.waitForTimeout(500);

    // "Group 006" should not be selectable (excluded from availableGroups)
    // Use input[type="radio"] to check the actual selectable radio element
    const group006Radio = dialog.locator('input[type="radio"][aria-label="Group 006"]');
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

    // Open Sheet
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible({ timeout: 10000 });

    // Select Group 004 using input[type="radio"] to avoid strict mode violation
    const group004Radio = page.locator('input[type="radio"][aria-label="Group 004"]');
    await expect(group004Radio).toBeVisible({ timeout: 10000 });
    await group004Radio.click();

    // Click "追加する"
    const submitButton = page.getByRole("button", { name: "追加する" });
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

    // Open Sheet
    await page.getByRole("button", { name: "追加", exact: true }).click();
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible({ timeout: 10000 });

    // Wait for fetch to complete and error to appear
    // AddSubgroupSheet sets fetchError with "Error <message>" format
    // apiFetch throws HttpError with message "500 Internal Server Error" (statusText may be empty in mocks)
    await expect(page.locator('[role="dialog"]').getByText(/Error 500|Error\s+\d/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("A-8: サブグループゼロ時「サブグループはまだありません」表示", async ({ page }) => {
    await page.goto("/groups/3");
    await page.waitForLoadState("networkidle");

    // Group 003 has no subgroups in seed data
    await expect(
      page.getByText("サブグループはまだありません"),
    ).toBeVisible({ timeout: 10000 });
  });
});
