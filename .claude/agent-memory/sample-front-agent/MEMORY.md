# Memory Index

- [IntersectionObserver infinite scroll pattern](pattern_infinite_scroll.md) — Implementation and testing patterns for IntersectionObserver-based infinite scroll in sample-front hooks
- [MockIntersectionObserver test setup](pattern_mock_intersection_observer.md) — How the MockIntersectionObserver in test/setup.ts works and how to use it in tests
- [API default params](api_defaults.md) — PRD-required default limit values for fetch functions (fetch-non-members: 100, not 500)
- [vitest vi.mock hoisting pattern](feedback_vitest_mock_hoisting.md) — Use vi.hoisted() for mock refs shared between vi.mock factories and test bodies to avoid ReferenceError
- [Native HTML table pattern in UserList](pattern_native_table.md) — UserList uses native `<table>` (not Radix UI), columnheader role on `<th>`, no avatar icon
- [Radix UI Theme wrapper in tests](pattern_radix_theme_test_wrapper.md) — DropdownMenu等のテストはThemeラッパーとResizeObserver mock(setup.ts)が必要。クリックはuserEvent使用
- [Radix UI Checkbox vs native input](pattern_radix_checkbox_vs_native.md) — Radix Checkboxはaria-checkedで確認。indeterminateはネイティブinput+useRef+useEffectが必須
- [Conditional object property with spread](feedback_conditional_object_spread.md) — optional APIパラメータはundefined代入でなくスプレッドで条件付き追加する（not.toHaveProperty テスト対策）
- [Responsive layout with CSS class + single MemberList](pattern_responsive_css_class.md) — APIを呼ぶコンポーネントは1つだけマウント。CSS クラスで split-view-pc/mobile を切り替える
