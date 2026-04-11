import { test, expect } from "@playwright/test";

/** Navigate to home page and filter to show Group 001 */
async function goToHomeAndShowGroup001(
  page: import("@playwright/test").Page,
) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const searchBox = page.getByPlaceholder("Search by name or description");
  await searchBox.fill("Group 001");
  await page.waitForTimeout(500);
  await expect(
    page.getByRole("button").filter({ hasText: "Group 001" }).first(),
  ).toBeVisible();
}

test.describe("シートナビゲーション", () => {
  test("グループ行クリックでシートが表示される", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("x ボタンクリックでシートが閉じる", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(600);

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("ESC キーでシートが閉じる", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    // Click the close button area (non-interactive part) to ensure focus is on the sheet,
    // not on a Radix TextField which may intercept Escape
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).focus();
    await page.keyboard.press("Escape");

    // Wait for close animation + navigation
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5000 });
  });

  test("オーバーレイクリックでシートが閉じる", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByTestId("sheet-overlay").click({ force: true });
    await page.waitForTimeout(600);

    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("シート内にグループ名・説明・メンバー一覧が表示される", async ({
    page,
  }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Group 001", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Description for Group 001"),
    ).toBeVisible();
    await expect(dialog.getByText("Members")).toBeVisible();
  });

  test("シートが開いた状態で body.style.overflow が hidden になる", async ({
    page,
  }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    const overflow = await page.evaluate(() => document.body.style.overflow);
    expect(overflow).toBe("hidden");
  });

  test("メンバー行クリックで MemberDetailSheet がスタックに積まれる", async ({
    page,
  }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    // Wait for members to load inside the dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Yamada Taro")).toBeVisible();

    // Click the member row (rendered as role="button" in MemberList)
    await dialog
      .getByRole("button")
      .filter({ hasText: "Yamada Taro" })
      .click();

    // Wait for the 2nd dialog (MemberDetailSheet stacked on top)
    await expect(page.getByRole("dialog")).toHaveCount(2);
  });

  test("MemberDetailSheet の x で MemberDetailSheet だけ閉じ GroupDetailSheet が残る", async ({
    page,
  }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    const groupDialog = page.getByRole("dialog");
    await expect(groupDialog.getByText("Yamada Taro")).toBeVisible();

    // Open MemberDetailSheet
    await groupDialog
      .getByRole("button")
      .filter({ hasText: "Yamada Taro" })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(2);

    // Close only the top sheet (last Close button)
    await page.getByRole("button", { name: "Close" }).last().click();
    await page.waitForTimeout(600);

    // Only the GroupDetailSheet should remain
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(
      page.getByRole("dialog").getByText("Group 001", { exact: true }),
    ).toBeVisible();
  });

  test("MemberDetailSheet にメンバー名が表示される", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    const groupDialog = page.getByRole("dialog");
    await expect(groupDialog.getByText("Yamada Taro")).toBeVisible();

    // Open MemberDetailSheet for Yamada Taro
    await groupDialog
      .getByRole("button")
      .filter({ hasText: "Yamada Taro" })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(2);

    // The top (last) dialog should contain the member name
    await expect(
      page.getByRole("dialog").last().getByText("Yamada Taro"),
    ).toBeVisible();
  });

  test("/groups/:id 直接アクセスでフルページ GroupDetailPage が表示される（シートなし）", async ({
    page,
  }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // No dialog should be present (full page rendering, not sheet)
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Group content should be displayed as a full page
    await expect(page.getByText("Group 001", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Description for Group 001"),
    ).toBeVisible();
  });

  test("API 404 時にシートが開いたままエラーメッセージが表示される", async ({
    page,
  }) => {
    // Intercept group detail API to return 404
    await page.route("**/api/v1/groups/1", (route) => {
      // Only intercept the group detail request, not members
      if (route.request().url().includes("/members")) {
        return route.continue();
      }
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ message: "not found" }),
      });
    });

    await goToHomeAndShowGroup001(page);

    await page
      .getByRole("button")
      .filter({ hasText: "Group 001" })
      .first()
      .click();
    await page.waitForSelector('[role="dialog"]');

    // The dialog should remain visible
    await expect(page.getByRole("dialog")).toBeVisible();

    // Error message should be displayed inside the dialog
    // useGroupDetail catches the error and sets String(err) which produces "Error: 404 Not Found"
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(/404/)).toBeVisible({ timeout: 5000 });
  });

  test("グループ一覧で検索後にシートを開閉しても再検索が機能する", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("Group 001");
    await page.waitForTimeout(500);

    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(600);

    // シートを閉じると navigate(-1) でホームに戻り検索はリセットされるが、
    // 再度検索すればグループが表示されることを確認する
    await searchBox.fill("Group 001");
    await page.waitForTimeout(500);
    await expect(page.getByRole("button").filter({ hasText: "Group 001" }).first()).toBeVisible();
  });

  test("シートが開いた状態で URL が /groups/:id になる（sheet presentation）", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    // アプリは navigate('/groups/1', { state: { presentation: 'sheet' } }) でシートを開く
    expect(page.url()).toContain("/groups/1");
  });

  test("Group 002 のシートを開くと Group 002 の名前・メンバー数が表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("Group 002");
    await page.waitForTimeout(500);
    await expect(page.getByRole("button").filter({ hasText: "Group 002" }).first()).toBeVisible();

    await page.getByRole("button").filter({ hasText: "Group 002" }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Group 002", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Description for Group 002")).toBeVisible();
    await expect(dialog.getByText("1 total")).toBeVisible();
  });

  test("GroupDetailSheet 内でメンバー検索 → Yamada で絞り込みが機能する", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText("Yamada Taro")).toBeVisible();

    const memberSearchBox = dialog.getByPlaceholder("Search members");
    await memberSearchBox.fill("Yamada");
    await page.waitForTimeout(500);

    await expect(dialog.getByText(/Yamada/)).toBeVisible();
  });

  test("GroupDetailSheet 内でメンバー検索 0 件時に空状態とページネーション非表示", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText("Yamada Taro")).toBeVisible();

    const memberSearchBox = dialog.getByPlaceholder("Search members");
    await memberSearchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);

    await expect(dialog.getByText("No members found.")).toBeVisible();
    expect(await dialog.getByRole("button", { name: /Previous/ }).count()).toBe(0);
    expect(await dialog.getByRole("button", { name: /Next/ }).count()).toBe(0);
  });

  test("GroupDetailSheet 内で検索クリア後に全メンバーが再表示される", async ({ page }) => {
    await goToHomeAndShowGroup001(page);

    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');

    const dialog = page.getByRole("dialog");

    await expect(dialog.getByText("Yamada Taro")).toBeVisible();

    const memberSearchBox = dialog.getByPlaceholder("Search members");
    await memberSearchBox.fill("Yamada");
    await page.waitForTimeout(500);
    await expect(dialog.getByText("Yamada Taro")).toBeVisible();

    await memberSearchBox.clear();
    await page.waitForTimeout(500);

    await expect(dialog.getByText("Yamada Taro")).toBeVisible();
    await expect(dialog.getByText("Suzuki Hanako")).toBeVisible();
  });

  test("シート閉閉後もグループ一覧の検索が継続して機能する", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("Group 001");
    await page.waitForTimeout(500);
    await page.getByRole("button").filter({ hasText: "Group 001" }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await page.waitForTimeout(600);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await searchBox.clear();
    await searchBox.fill("Group 002");
    await page.waitForTimeout(500);

    await expect(page.getByRole("button").filter({ hasText: "Group 002" }).first()).toBeVisible();
    expect(await page.getByRole("button").filter({ hasText: "Group 001" }).count()).toBe(0);
  });
});
