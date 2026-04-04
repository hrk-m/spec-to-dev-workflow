import { test, expect } from '@playwright/test';

test.describe('グループ一覧ページ', () => {
  test('ページ見出しとグループカードが 1 件以上表示される', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: 'Groups', level: 1 });
    await expect(heading).toBeVisible();

    const cards = page.getByRole('button');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });

  test('カードをクリックするとグループ詳細ページに遷移する', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button').filter({ hasText: /Group/ }).first().click();
    await page.waitForURL(/\/groups\/\d+/);

    expect(page.url()).toMatch(/\/groups\/\d+/);
  });

  test('検索キーワードでグループを絞り込める', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const allCards = await page.getByRole('button').count();

    const searchBox = page.getByPlaceholder('Search by name or description');
    await searchBox.fill('Group 001');

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    const filteredCards = await page.getByRole('button').count();
    expect(filteredCards).toBeLessThanOrEqual(allCards);
    expect(filteredCards).toBeGreaterThanOrEqual(1);
  });
});
