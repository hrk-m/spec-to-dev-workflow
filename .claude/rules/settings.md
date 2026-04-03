# Settings ファイルの使い分け

## 基本方針

| ファイル                      | 用途                                               | Git 管理 |
| ----------------------------- | -------------------------------------------------- | -------- |
| `.claude/settings.json`       | プロジェクト全体に関する設定（チーム共有）         | ✅ する  |
| `.claude/settings.local.json` | 個人のファイル参照権限・ローカル固有の設定         | ❌ しない |

## ルール

- **ファイル参照権限**（`permissions` の `allow` / `deny`）は `.claude/settings.local.json` に記載する
- プロジェクト全体に適用したい設定（hooks など）は `.claude/settings.json` に記載する
- `.claude/settings.local.json` は `.gitignore` に含め、リポジトリにコミットしない
