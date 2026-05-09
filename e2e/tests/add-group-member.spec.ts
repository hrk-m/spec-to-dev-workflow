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
  test("[TC-01] /groups/1 に「メンバー追加」ボタンが表示される", async ({
    page,
  }) => {
    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByRole("button", { name: "メンバー追加" }),
    ).toBeVisible();
  });

  // TC-02: 「メンバー追加」ボタンクリックで AddMemberSheet が表示され非メンバー一覧が描画される
  test("[TC-02] 「メンバー追加」ボタンクリックで AddMemberSheet が表示され非メンバー一覧が描画される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByPlaceholder("Search non-members")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
  });

  // TC-03: ユーザーを選択して「一括追加」でメンバー追加成功 → シートが閉じ、既存メンバーも正常表示
  test("[TC-03] ユーザーを選択して「一括追加」でメンバー追加成功 → シートが閉じ、既存メンバーも正常表示", async ({
    page,
  }) => {
    await mockAddMembersPost(page, 201, {
      members: [{ id: 3, first_name: "Jiro", last_name: "Tanaka" }],
    });
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.locator("tbody tr").filter({ hasText: "Tanaka Jiro" }).click();
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeEnabled();
    await dialog.getByRole("button", { name: "一括追加" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    // リグレッション: 既存メンバーが正常表示されること
    await expect(page.getByText("Yamada Taro")).toBeVisible();
  });

  // TC-04: GroupDetailSheet（ホーム→シート）でも「メンバー追加」ボタンで AddMemberSheet が開く
  test("[TC-04] GroupDetailSheet（ホーム→シート）でも「メンバー追加」ボタンで AddMemberSheet が開く", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("Group 001");
    await page.waitForTimeout(500);
    await page
      .locator("tbody tr")
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
  });

  // TC-05: 追加成功後に member_count が増加した値で表示される（stateful mock）
  test("[TC-05] 追加成功後に member_count が増加した値で表示される", async ({
    page,
  }) => {
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
        url.includes("/members") &&
        postCompleted
      ) {
        // GroupDetailContent は表示件数に useMemberList の total（apiTotal）を優先するため、
        // POST 後の GET /members も total: 3 で返さないと "3件" が描画されない。
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            members: [
              {
                id: 1,
                uuid: "00000000-0000-0000-0000-000000000001",
                first_name: "Taro",
                last_name: "Yamada",
                source_groups: [{ group_id: 1, group_name: "Group 001" }],
              },
              {
                id: 2,
                uuid: "00000000-0000-0000-0000-000000000002",
                first_name: "Hanako",
                last_name: "Suzuki",
                source_groups: [{ group_id: 1, group_name: "Group 001" }],
              },
              {
                id: 3,
                uuid: "00000000-0000-0000-0000-000000000003",
                first_name: "Jiro",
                last_name: "Tanaka",
                source_groups: [{ group_id: 1, group_name: "Group 001" }],
              },
            ],
            total: 3,
            duplicate_count: 0,
          }),
        });
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
    await expect(page.getByText("2件")).toBeVisible();

    await page.getByRole("button", { name: "メンバー追加" }).click();
    await page.waitForSelector('[role="dialog"]');
    await waitForNonMemberList(page);

    const dialog = page.getByRole("dialog");
    await dialog.locator("tbody tr").filter({ hasText: "Tanaka Jiro" }).click();
    await dialog.getByRole("button", { name: "一括追加" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText("3件")).toBeVisible({ timeout: 5000 });
  });

  // TC-06: 複数ユーザーを同時に選択して一括追加できる
  test("[TC-06] 複数ユーザーを同時に選択して一括追加できる", async ({
    page,
  }) => {
    await mockAddMembersPost(page, 201, {
      members: [
        { id: 3, first_name: "Jiro", last_name: "Tanaka" },
        { id: 4, first_name: "Yuki", last_name: "Sato" },
      ],
    });
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.locator("tbody tr").filter({ hasText: "Tanaka Jiro" }).click();
    await dialog.locator("tbody tr").filter({ hasText: "Sato Yuki" }).click();
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeEnabled();
    await dialog.getByRole("button", { name: "一括追加" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // TC-07: 未選択状態では「一括追加」ボタンが非活性
  test("[TC-07] 未選択状態では「一括追加」ボタンが非活性", async ({ page }) => {
    await openAddMemberSheetOnFullPage(page);
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeDisabled();
  });

  // TC-08: 検索キーワードで非メンバー一覧が絞り込まれる
  test("[TC-08] 検索キーワードで非メンバー一覧が絞り込まれる", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Search non-members").fill("Tanaka");
    await page.waitForTimeout(500);
    await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
    await expect(dialog.getByText("Sato Yuki")).not.toBeVisible();
  });

  // TC-09: 検索クリア後に非メンバー全件が再表示される
  test("[TC-09] 検索クリア後に非メンバー全件が再表示される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Search non-members").fill("Tanaka");
    await page.waitForTimeout(500);
    await expect(dialog.getByText("Tanaka Jiro")).toBeVisible();
    await dialog.getByPlaceholder("Search non-members").clear();
    await page.waitForTimeout(500);
    await expect(dialog.getByText("Sato Yuki")).toBeVisible();
  });

  // TC-10: 検索結果 0 件時に空状態メッセージが表示される
  test("[TC-10] 検索結果 0 件時に空状態メッセージが表示される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("Search non-members").fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);
    await expect(
      dialog.getByText("追加できるユーザーがいません。"),
    ).toBeVisible();
  });

  // TC-11: AddMemberSheet 内にページネーション UI（ページサイズセレクタ・Previous/Next）が存在しない
  test("[TC-11] AddMemberSheet 内にページネーション UI（ページサイズセレクタ・Previous/Next）が DOM に存在しない", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await page.waitForSelector('[role="dialog"]');
    const dialog = page.getByRole("dialog");

    // Previous/Next pagination buttons must be absent
    expect(await dialog.getByRole("button", { name: /Previous/ }).count()).toBe(
      0,
    );
    expect(await dialog.getByRole("button", { name: /Next/ }).count()).toBe(0);

    // Page-size selector buttons (20/50/100) must be absent
    expect(
      await dialog.locator("button[type='button']", { hasText: "20" }).count(),
    ).toBe(0);
    expect(
      await dialog.locator("button[type='button']", { hasText: "50" }).count(),
    ).toBe(0);
    expect(
      await dialog.locator("button[type='button']", { hasText: "100" }).count(),
    ).toBe(0);
  });

  // TC-13: 既存メンバーを追加しようとすると 409 エラーメッセージが表示される
  test("[TC-13] 既存メンバーを追加しようとすると 409 エラーメッセージが表示される", async ({
    page,
  }) => {
    await mockAddMembersPost(page, 409, {
      message: "your requested item already exists",
    });
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    await dialog.locator("tbody tr").filter({ hasText: "Tanaka Jiro" }).click();
    await dialog.getByRole("button", { name: "一括追加" }).click();
    await expect(
      dialog.getByText("選択したユーザーはすでにメンバーです"),
    ).toBeVisible({ timeout: 5000 });
    // エラー時はダイアログが開いたまま
    await expect(dialog).toBeVisible();
  });

  // TC-14: GET /non-members が失敗するとシート内にエラーメッセージが表示される
  test("[TC-14] GET /non-members が失敗するとシート内にエラーメッセージが表示される", async ({
    page,
  }) => {
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
  });

  // TC-15: Group 4 の AddMemberSheet に非メンバーが正しく表示される（seed data 確認）
  test("[TC-15] Group 4 の AddMemberSheet に非メンバーが正しく表示される（seed data 確認）", async ({
    page,
  }) => {
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
  });

  // TC-12: ヘッダーチェックボックスで全非メンバーを全選択し一括追加できる
  test("[TC-12] ヘッダーチェックボックスで全非メンバーを全選択し一括追加できる", async ({
    page,
  }) => {
    await mockAddMembersPost(page, 201, {
      members: [
        { id: 3, first_name: "Jiro", last_name: "Tanaka" },
        { id: 4, first_name: "Yuki", last_name: "Sato" },
      ],
    });
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");

    // ヘッダーチェックボックスをクリックして全選択
    await dialog.getByTestId("header-checkbox").click();

    // 一括追加ボタンが活性化されていることを確認
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeEnabled();

    // 一括追加をクリック
    await dialog.getByRole("button", { name: "一括追加" }).click();

    // シートが閉じることを確認
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // リグレッション: 既存メンバーが正常表示されること
    await expect(page.getByText("Yamada Taro")).toBeVisible();
  });

  // TC-17: ヘッダークリックで全選択→再クリックで全解除（トグル動作）
  test("[TC-17] ヘッダークリックで全選択→再クリックで全解除（トグル動作）", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");
    const rows = dialog.locator("tbody tr");

    // 1回目クリック: 全選択
    await dialog.getByTestId("header-checkbox").click();
    // 一括追加ボタンが活性化
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeEnabled();
    // 全行が選択状態
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).locator('[role="checkbox"]')).toHaveAttribute(
        "aria-checked",
        "true",
      );
    }

    // 2回目クリック: 全解除
    await dialog.getByTestId("header-checkbox").click();
    // 一括追加ボタンが非活性
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeDisabled();
    // 全行が解除状態
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).locator('[role="checkbox"]')).toHaveAttribute(
        "aria-checked",
        "false",
      );
    }
  });

  // TC-18: indeterminate 状態でヘッダークリックすると全選択される
  test("[TC-18] indeterminate 状態でヘッダークリックすると全選択される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");

    // 1件だけ選択して indeterminate 状態にする
    await dialog.locator("tbody tr").first().click();
    // 一括追加ボタンが活性化（1件選択）
    await expect(
      dialog.getByRole("button", { name: "一括追加" }),
    ).toBeEnabled();

    // ヘッダーチェックボックスが indeterminate 状態であることを確認
    const isIndeterminate = await dialog
      .getByTestId("header-checkbox")
      .evaluate((el: HTMLInputElement) => el.indeterminate);
    expect(isIndeterminate).toBe(true);

    // ヘッダーチェックボックスをクリックして全選択
    await dialog.getByTestId("header-checkbox").click();

    // 全行が選択状態
    const rows = dialog.locator("tbody tr");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
      await expect(rows.nth(i).locator('[role="checkbox"]')).toHaveAttribute(
        "aria-checked",
        "true",
      );
    }
  });

  // TC-19: 非メンバー 0 件時にヘッダー checkbox が disabled で操作不可
  test("[TC-19] 非メンバー 0 件時にヘッダー checkbox が disabled で操作不可", async ({
    page,
  }) => {
    // 非メンバー一覧 API をモック: 空リストを返す（クエリパラメータ付き URL に対応するため末尾に ** を追加）
    await page.route("**/api/v1/groups/1/non-members**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ users: [], total: 0 }),
      });
    });

    await openAddMemberSheetOnFullPage(page);
    const dialog = page.getByRole("dialog");
    // 空状態メッセージが表示されるまで待機
    await expect(
      dialog.getByText("追加できるユーザーがいません。"),
    ).toBeVisible({ timeout: 5000 });

    // ヘッダー checkbox が disabled であることを確認
    await expect(dialog.getByTestId("header-checkbox")).toBeDisabled();
  });

  // N-3: AddMemberSheet の uuid 列ヘッダーが表示される
  test("[N-3] AddMemberSheet の uuid 列ヘッダーが表示される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    const dialog = page.getByRole("dialog");
    // スケルトン表示中でも uuid columnheader は即時表示されるため、データ読み込み待ち不要
    await expect(
      dialog.getByRole("columnheader", { name: "uuid" }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  // N-4: AddMemberSheet の各ユーザー行に uuid 値が表示される
  test("[N-4] AddMemberSheet の各ユーザー行に uuid 値が表示される", async ({
    page,
  }) => {
    await openAddMemberSheetOnFullPage(page);
    await waitForNonMemberList(page);
    const dialog = page.getByRole("dialog");

    // Group 1 の非メンバー Tanaka Jiro (uuid: 00000000-0000-0000-0000-000000000003)
    await expect(
      dialog.getByText("00000000-0000-0000-0000-000000000003"),
    ).toBeVisible();
  });

  // TC-16: メンバー追加後に AddMemberSheet を再度開くと追加済みユーザーが非メンバーリストに表示されない
  test("[TC-16] メンバー追加後に AddMemberSheet を再度開くと追加済みユーザーが非メンバーリストに表示されない（キャッシュクリア確認）", async ({
    page,
  }) => {
    // POST をモックして DB 書き込みを防ぐ（stateful mock パターン）
    // 1st GET /non-members: 実 API を使い Tanaka Jiro が表示されることを確認
    // POST /members: モックで 201 を返す（DB への書き込みなし）
    // 2nd GET /non-members: Tanaka Jiro を除いたモックレスポンスを返す
    let postCompleted = false;

    await page.route("**/api/v1/groups/1/**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes("/non-members")) {
        if (postCompleted) {
          // 2nd open: Tanaka Jiro を含まないモックレスポンスを返す
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              users: [
                { id: 4, uuid: "", first_name: "Yuki", last_name: "Sato" },
              ],
              total: 1,
            }),
          });
        } else {
          // 1st open: 実 API を通して Tanaka Jiro が表示されることを確認
          await route.continue();
        }
      } else if (url.includes("/members") && method === "POST") {
        // POST をモックして DB に書き込まない
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            members: [{ id: 3, first_name: "Jiro", last_name: "Tanaka" }],
          }),
        });
        postCompleted = true;
      } else {
        await route.continue();
      }
    });

    await page.goto(GROUP_1_URL);
    await page.waitForLoadState("networkidle");

    // 1st open: AddMemberSheet を開き、Tanaka Jiro が非メンバー一覧にいることを確認（実 API）
    await page.getByRole("button", { name: "メンバー追加" }).click();
    await page.waitForSelector('[role="dialog"]');
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tanaka Jiro")).toBeVisible({
      timeout: 5000,
    });

    // Tanaka Jiro を選択して「一括追加」（POST はモックされ DB に書き込まない）
    await dialog.locator("tbody tr").filter({ hasText: "Tanaka Jiro" }).click();
    await dialog.getByRole("button", { name: "一括追加" }).click();

    // シートが閉じるまで待つ
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 2nd open: AddMemberSheet を再度開く → キャッシュがクリアされ新鮮なデータが取得される
    await page.getByRole("button", { name: "メンバー追加" }).click();
    await page.waitForSelector('[role="dialog"]');
    const dialog2 = page.getByRole("dialog");
    await page.waitForLoadState("networkidle");

    // 追加済みの Tanaka Jiro は非メンバーリストに表示されない（モックレスポンスで確認）
    await expect(dialog2.getByText("Tanaka Jiro")).not.toBeVisible({
      timeout: 5000,
    });
  });
});
