---
name: Radix UI Theme wrapper in tests
description: @radix-ui/themes コンポーネント（DropdownMenu等）を含むテストは Theme ラッパーが必要。また ResizeObserver のモックも setup.ts に必要。
type: feedback
---

`@radix-ui/themes` の `DropdownMenu` など Theme コンテキストを必要とするコンポーネントをテストする場合、`useThemeContext must be used within a Theme` エラーが発生する。

**Solution**: テストヘルパー関数で `Theme` でラップする:

```tsx
import { Theme } from "@radix-ui/themes";

function renderWithTheme(ui: React.ReactElement) {
  return render(<Theme>{ui}</Theme>);
}
```

また、Radix UI の `ScrollArea` などが `ResizeObserver` を必要とするため、`src/test/setup.ts` に mock を追加する:

```ts
class MockResizeObserver implements ResizeObserver {
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
```

**Why:** jsdom は `ResizeObserver` を実装していないため、Radix UI のコンポーネントが使用する際にエラーになる。

**How to apply:** Radix UI themes のコンポーネント（DropdownMenu, ScrollArea 等）を含むウィジェット・ページのテストを書く際は、必ずこのパターンを使う。

また、Radix UI の DropdownMenu のクリックテストには `fireEvent.click` ではなく `@testing-library/user-event` の `userEvent.click` を使う（Radix の内部状態管理のため）。
