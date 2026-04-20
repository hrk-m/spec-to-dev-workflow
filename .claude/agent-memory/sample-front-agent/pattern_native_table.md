---
name: Native HTML table pattern in UserList
description: How native <table> is used in UserList.tsx (not Radix UI Table) for id/uuid/姓名 columns
type: project
---

The `UserList` component uses native HTML `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` — NOT Radix UI Table component. This was required by the PRD (list-users) for the id / uuid / 姓名 column layout.

Key implementation decisions:
- `<th>` elements get ARIA `columnheader` role automatically, testable with `screen.getByRole("columnheader", { name: "id" })`
- Skeleton rows are `<tr>` with 3 `<td>` cells matching the column count
- No avatar/icon component — removed entirely from UserList (unlike MemberList which keeps avatar)
- Table styles use `borderCollapse: "collapse"` with per-cell padding

**Why:** PRD required table format with explicit id/uuid/姓名 headers. Native table gives semantic column headers for free.

**How to apply:** When the PRD specifies `<table>` format, use native HTML elements and add `data-testid` attributes on avatar elements if they need to be asserted absent in tests.
