import { test, expect } from "@playwright/test";

// ─── 定数 ───────────────────────────────────────────────
const GROUP_1_URL = "/groups/1";
const GROUP_4_URL = "/groups/4";
const GROUP_1_MEMBERS_API = "**/api/v1/groups/1/members";
const GROUP_1_NON_MEMBERS_API = "**/api/v1/groups/1/non-members";

const GROUP_1_UPDATED_DATA = {
  id: 1,
  name: "Group 001",
  description: "Description for Group 001",
  member_count: 3,
};

// ─── ヘルパー ────────────────────────────────────────────

/** /groups/1 フルページを開き、AddMemberSheet を表示する */
async function openAddMemberSheetOnFullPage(
  page: import("@playwright/test").Page,
) {
  await page.goto(GROUP_1_URL);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "メンバー追加" }).click();
  await page.waitForSelector('[role="dialog"]');
}

/** ダイアログ内の非メンバー一覧（Tanaka Jiro）が表示されるまで待機する */
async function waitForNonMemberList(page: import("@playwright/test").Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Tanaka Jiro")).toBeVisible({ timeout: 5000 });
}

/**
 * POST /api/v1/groups/1/members を指定ステータスでモックする。
 * GET・non-members 等は全てパス。
 */
async function mockAddMembersPost(
  page: import("@playwright/test").Page,
  status: number,
  body?: object,
) {
  await page.route(GROUP_1_MEMBERS_API, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body ?? {}),
      });
    } else {
      await route.continue();
    }
  });
}

// ─── テスト ──────────────────────────────────────────────

test.describe("グループメンバー追加", () => {
  // TC-01: /groups/1 に「メンバー追加」ボタンが表示される
  test(
    "[TC-01] /groups/1 に「メンバー追加」ボタンが表示される",
    async ({ page }) => {
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await expect(
        page.getByRole("button", { name: "メンバー追加" }),
      ).toBeVisible();
    },
  );

  // TC-02: 「メンバー追加」ボタンクリックで AddMemberSheet が表示され非メンバー一覧が描画される
  test(
    "[TC-02] 「メンバー追加」ボタンクリックで AddMemberSheet が表示され非メンバー一覧が描画される",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByPlaceholder("Search non-members"),
      ).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
    },
  );

  // TC-03: ユーザーを選択して「一括追加」でメンバー追加成功 → シートが閉じ、既存メンバーも正常表示
  test(
    "[TC-03] ユーザーを選択して「一括追加」でメンバー追加成功 → シートが閉じ、既存メンバーも正常表示",
    async ({ page }) => {
      await mockAddMembersPost(page, 201, {
        members: [{ id: 3, first_name: "Jiro", last_name: "Tanaka" }],
      });
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button")
        .filter({ hasText: "Tanaka Jiro" })
        .click();
      await expect(
        dialog.getByRole("button", { name: "一括追加" }),
      ).toBeEnabled();
      await dialog.getByRole("button", { name: "一括追加" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      // リグレッション: 既存メンバーが正常表示されること
      await expect(page.getByText("Yamada Taro")).toBeVisible();
    },
  );

  // TC-04: GroupDetailSheet（ホーム→シート）でも「メンバー追加」ボタンで AddMemberSheet が開く
  test(
    "[TC-04] GroupDetailSheet（ホーム→シート）でも「メンバー追加」ボタンで AddMemberSheet が開く",
    async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const searchBox = page.getByPlaceholder("Search by name or description");
      await searchBox.fill("Group 001");
      await page.waitForTimeout(500);
      await page
        .getByRole("button")
        .filter({ hasText: "Group 001" })
        .first()
        .click();
      await page.waitForSelector('[role="dialog"]');
      const groupDialog = page.getByRole("dialog").first();
      await groupDialog.getByRole("button", { name: "メンバー追加" }).click();
      // AddMemberSheet が 2 枚目のダイアログとして重なる
      await expect(page.getByRole("dialog")).toHaveCount(2, { timeout: 5000 });
      const addMemberDialog = page.getByRole("dialog").last();
      await expect(
        addMemberDialog.getByPlaceholder("Search non-members"),
      ).toBeVisible();
    },
  );

  // TC-05: 追加成功後に member_count が増加した値で表示される（stateful mock）
  test(
    "[TC-05] 追加成功後に member_count が増加した値で表示される",
    async ({ page }) => {
      let postCompleted = false;
      await page.route("**/api/v1/groups/1**", async (route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes("/non-members")) {
          await route.continue();
        } else if (url.includes("/members") && method === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              members: [{ id: 3, first_name: "Jiro", last_name: "Tanaka" }],
            }),
          });
          postCompleted = true;
        } else if (
          method === "GET" &&
          !url.includes("/members") &&
          postCompleted
        ) {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(GROUP_1_UPDATED_DATA),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await expect(page.getByText("2 total")).toBeVisible();

      await page.getByRole("button", { name: "メンバー追加" }).click();
      await page.waitForSelector('[role="dialog"]');
      await waitForNonMemberList(page);

      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button")
        .filter({ hasText: "Tanaka Jiro" })
        .click();
      await dialog.getByRole("button", { name: "一括追加" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText("3 total")).toBeVisible({ timeout: 5000 });
    },
  );

  // TC-06: 複数ユーザーを同時に選択して一括追加できる
  test(
    "[TC-06] 複数ユーザーを同時に選択して一括追加できる",
    async ({ page }) => {
      await mockAddMembersPost(page, 201, {
        members: [
          { id: 3, first_name: "Jiro", last_name: "Tanaka" },
          { id: 4, first_name: "Yuki", last_name: "Sato" },
        ],
      });
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button")
        .filter({ hasText: "Tanaka Jiro" })
        .click();
      await dialog
        .getByRole("button")
        .filter({ hasText: "Sato Yuki" })
        .click();
      await expect(
        dialog.getByRole("button", { name: "一括追加" }),
      ).toBeEnabled();
      await dialog.getByRole("button", { name: "一括追加" }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    },
  );

  // TC-07: 未選択状態では「一括追加」ボタンが非活性
  test(
    "[TC-07] 未選択状態では「一括追加」ボタンが非活性",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: "一括追加" }),
      ).toBeDisabled();
    },
  );

  // TC-08: 検索キーワードで非メンバー一覧が絞り込まれる
  test(
    "[TC-08] 検索キーワードで非メンバー一覧が絞り込まれる",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Search non-members").fill("Tanaka");
      await page.waitForTimeout(500);
      await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
      await expect(dialog.getByText("Sato Yuki")).not.toBeVisible();
    },
  );

  // TC-09: 検索クリア後に非メンバー全件が再表示される
  test(
    "[TC-09] 検索クリア後に非メンバー全件が再表示される",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder("Search non-members").fill("Tanaka");
      await page.waitForTimeout(500);
      await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
      await dialog.getByPlaceholder("Search non-members").clear();
      await page.waitForTimeout(500);
      await expect(dialog.getByText("Sato Yuki")).toBeVisible();
    },
  );

  // TC-10: 検索結果 0 件時に空状態メッセージが表示される
  test(
    "[TC-10] 検索結果 0 件時に空状態メッセージが表示される",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .getByPlaceholder("Search non-members")
        .fill("ZZZZNONEXISTENT");
      await page.waitForTimeout(500);
      await expect(
        dialog.getByText("追加できるユーザーがいません。"),
      ).toBeVisible();
    },
  );

  // TC-11: ページサイズ切替（20/50/100）コントロールが AddMemberSheet 内に表示される
  test(
    "[TC-11] ページサイズ切替（20/50/100）コントロールが AddMemberSheet 内に表示される",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      await page.waitForSelector('[role="dialog"]');
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.locator("button[type='button']", { hasText: "20" }).first(),
      ).toBeVisible();
      await expect(
        dialog.locator("button[type='button']", { hasText: "50" }).first(),
      ).toBeVisible();
      await expect(
        dialog.locator("button[type='button']", { hasText: "100" }).first(),
      ).toBeVisible();
    },
  );

  // TC-12: AddMemberSheet 内に Previous/Next ページネーションが表示される
  test(
    "[TC-12] AddMemberSheet 内に Previous/Next ページネーションが表示される",
    async ({ page }) => {
      await openAddMemberSheetOnFullPage(page);
      await page.waitForLoadState("networkidle");
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: /Previous/ }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: /Next/ }),
      ).toBeVisible();
    },
  );

  // TC-13: 既存メンバーを追加しようとすると 409 エラーメッセージが表示される
  test(
    "[TC-13] 既存メンバーを追加しようとすると 409 エラーメッセージが表示される",
    async ({ page }) => {
      await mockAddMembersPost(page, 409, {
        message: "your requested item already exists",
      });
      await openAddMemberSheetOnFullPage(page);
      await waitForNonMemberList(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button")
        .filter({ hasText: "Tanaka Jiro" })
        .click();
      await dialog.getByRole("button", { name: "一括追加" }).click();
      await expect(
        dialog.getByText("選択したユーザーはすでにメンバーです"),
      ).toBeVisible({ timeout: 5000 });
      // エラー時はダイアログが開いたまま
      await expect(dialog).toBeVisible();
    },
  );

  // TC-14: GET /non-members が失敗するとシート内にエラーメッセージが表示される
  test(
    "[TC-14] GET /non-members が失敗するとシート内にエラーメッセージが表示される",
    async ({ page }) => {
      // クエリパラメータ付きURLにも対応するため、ワイルドカードパターンを使用
      await page.route("**/api/v1/groups/1/non-members**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "internal server error" }),
        });
      });
      await page.goto(GROUP_1_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "メンバー追加" }).click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForTimeout(2000);
      const dialog = page.getByRole("dialog");
      // apiFetch は 500 時に "Error: 500 Internal Server Error" をスローし、
      // useNonMemberList は String(err) でセットするため "Error: 500 ..." が表示される
      await expect(dialog.getByText(/500/)).toBeVisible({ timeout: 5000 });
    },
  );

  // TC-15: Group 4 の AddMemberSheet に非メンバーが正しく表示される（seed data 確認）
  test(
    "[TC-15] Group 4 の AddMemberSheet に非メンバーが正しく表示される（seed data 確認）",
    async ({ page }) => {
      await page.goto(GROUP_4_URL);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "メンバー追加" }).click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForLoadState("networkidle");
      const dialog = page.getByRole("dialog");
      // user 1: Yamada Taro は Group 4 の非メンバー → 表示される
      await expect(dialog.getByText("Yamada Taro")).toBeVisible();
      // user 3: Tanaka Jiro は Group 4 の非メンバー → 表示される
      await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
      // user 2: Suzuki Hanako は Group 4 のメンバー → 表示されない
      await expect(dialog.getByText("Suzuki Hanako")).not.toBeVisible();
    },
  );
});
