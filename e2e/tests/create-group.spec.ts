import { test, expect } from "@playwright/test";

test.describe("グループ作成モーダル", () => {
  test("Create Group ボタンがリストページに表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const createButton = page.getByRole("button", { name: "Create Group" });
    await expect(createButton).toBeVisible();
  });

  test("Create Group ボタンをクリックするとモーダルが開く", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Create Group" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Create Group" }),
    ).toBeVisible();
  });

  test("名前と説明を入力してグループを作成すると /groups/:id に遷移する", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Intercept POST to mock a successful group creation response
    const createdGroupId = 42;
    await page.route("**/api/v1/groups", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: createdGroupId,
            name: "Test Group E2E",
            description: "E2E test description",
            member_count: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Group name").fill("Test Group E2E");
    await dialog
      .getByPlaceholder("Optional description")
      .fill("E2E test description");

    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    // Verify navigation to the group detail page using the id from API response
    await page.waitForURL(`/groups/${String(createdGroupId)}`);
    expect(page.url()).toContain(`/groups/${String(createdGroupId)}`);
  });

  test("説明なしでグループを作成すると /groups/:id に遷移する", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Intercept POST to mock a successful group creation response
    const createdGroupId = 43;
    await page.route("**/api/v1/groups", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: createdGroupId,
            name: "No Description Group",
            description: "",
            member_count: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Group name").fill("No Description Group");

    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    // Verify navigation to the group detail page using the id from API response
    await page.waitForURL(`/groups/${String(createdGroupId)}`);
    expect(page.url()).toContain(`/groups/${String(createdGroupId)}`);
  });

  test("名前が空の状態で送信すると 'Name is required' エラーが表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    await expect(dialog.getByText("Name is required")).toBeVisible();
  });

  test("名前が 101 文字の場合 'Name must be 100 characters or less' エラーが表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const longName = "a".repeat(101);
    await dialog.getByPlaceholder("Group name").fill(longName);
    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    await expect(
      dialog.getByText("Name must be 100 characters or less"),
    ).toBeVisible();
  });

  test("Cancel ボタンをクリックするとモーダルが閉じる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).click();

    await expect(dialog).not.toBeVisible();
  });

  test("送信中は Create ボタンが無効になる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Intercept POST to delay the response
    await page.route("**/api/v1/groups", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 9999,
            name: "Delayed Group",
            description: "",
            member_count: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Group name").fill("Loading Test Group");

    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    // The Create button should be disabled while the request is in flight
    await expect(
      dialog.getByRole("button", { name: "Create", exact: true }),
    ).toBeDisabled();
  });

  test("API が 500 を返すとモーダルが開いたままエラーメッセージが表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Intercept POST to return 500
    await page.route("**/api/v1/groups", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByRole("button", { name: "Create Group" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder("Group name").fill("Error Test Group");

    await dialog.getByRole("button", { name: "Create", exact: true }).click();

    // Modal should stay open
    await expect(dialog).toBeVisible();

    // Error message should be visible inside the dialog
    // The apiFetch throws "Error: 500 Internal Server Error", and useCreateGroup sets error to String(err)
    await expect(dialog.getByText("500 Internal Server Error")).toBeVisible();
  });
});
