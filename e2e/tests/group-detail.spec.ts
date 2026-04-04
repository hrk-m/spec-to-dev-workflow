import { test, expect } from '@playwright/test';

test.describe('グループ詳細ページ', () => {
  test('グループ名・説明・メンバーセクションが表示される', async ({ page }) => {
    await page.goto('/groups/1');
    await page.waitForLoadState('networkidle');

    // Group name should be visible (seed data: "Group 001")
    await expect(page.getByText('Group 001', { exact: true })).toBeVisible();

    // Description should be visible
    await expect(page.getByText('Description for Group 001')).toBeVisible();

    // Members section should exist
    await expect(page.getByText('Members')).toBeVisible();
  });

  test('Groups ボタンをクリックすると一覧に戻る', async ({ page }) => {
    await page.goto('/groups/1');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Groups/ }).first().click();
    await page.waitForURL('/');

    expect(page.url()).toMatch(/\/$/);
  });

  test('検索キーワードでメンバーを絞り込める', async ({ page }) => {
    await page.goto('/groups/1');
    await page.waitForLoadState('networkidle');

    const searchBox = page.getByPlaceholder('Search members');
    await expect(searchBox).toBeVisible();

    // Get initial state
    await searchBox.fill('Yamada');

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    // At least one member should match (seed data: group 1 has "Yamada Taro")
    const memberItems = page.getByText(/Yamada/);
    await expect(memberItems.first()).toBeVisible();
  });
});
