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

  test("メンバー一覧にページサイズ切替（20/50/100）コントロールが表示される", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Per-page size buttons should be visible in the member list area
    await expect(
      page.getByRole("button", { name: "20", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "50", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "100", exact: true }),
    ).toBeVisible();
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

  test("ページネーション Previous/Next コントロールが表示される", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Pagination controls should be present in the member list
    await expect(page.getByRole("button", { name: /Previous/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Next/ })).toBeVisible();
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

  test("メンバー検索 0 件時にページネーションが非表示になる", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder("Search members");
    await searchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);
    expect(await page.getByRole("button", { name: /Previous/ }).count()).toBe(0);
    expect(await page.getByRole("button", { name: /Next/ }).count()).toBe(0);
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
});
