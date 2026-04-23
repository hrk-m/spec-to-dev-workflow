---
name: Radix UI Checkbox vs native input in tests
description: Radix UI Checkbox は role=checkbox のボタン要素であり .checked プロパティがない。aria-checked 属性で確認する。indeterminate はネイティブ input + useRef + useEffect で設定する。
type: project
---

Radix UI の `<Checkbox>` は `role="checkbox"` を持つボタン要素（`<button>`）であり、ネイティブの `<input type="checkbox">` ではない。

## テストでの確認方法

- 行チェックボックス（Radix UI `<Checkbox>`）: `.checked` プロパティは存在しない。`aria-checked` 属性で確認する
  ```ts
  expect(checkbox).toHaveAttribute("aria-checked", "true");
  ```
- ヘッダーチェックボックス（ネイティブ `<input type="checkbox">`）: `.checked`, `.indeterminate` プロパティで確認できる
  ```ts
  const headerCheckbox = screen.getByTestId("header-checkbox") as HTMLInputElement;
  expect(headerCheckbox.checked).toBe(true);
  expect(headerCheckbox.indeterminate).toBe(true);
  ```

## indeterminate の設定

Radix UI `<Checkbox>` は `indeterminate` prop に対応していない。ネイティブ `<input type="checkbox">` + `useRef` + `useEffect` で DOM プロパティを直接設定する必要がある。

```tsx
const headerCheckboxRef = useRef<HTMLInputElement>(null);
useEffect(() => {
  if (headerCheckboxRef.current) {
    headerCheckboxRef.current.indeterminate = isSomeSelected;
  }
}, [isSomeSelected, isAllSelected]);
```

**Why:** jsdom 環境では `indeterminate` は DOM プロパティとして設定する必要があり、React の `checked` prop とは別管理。
**How to apply:** 全選択ヘッダーチェックボックスのような「indeterminate が必要なチェックボックス」は必ずネイティブ input を使う。
