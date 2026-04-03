---
name: api-sync
description: 現コード（sample-api/）を読み取り、plans/{機能名}/{verb-noun}/prd.md を生成・更新する。機能名はエンドポイントのリソース名（複数形）を使用。
---

# /api-sync — 現コードから plans/prd.md を生成・更新する

## 役割

`sample-api/` の現コードを読み取り、`plans/{機能名}/{verb-noun}/prd.md` を生成または更新する。

- **新規作成**: ファイルが存在しない場合、テンプレートをもとに生成する
- **更新**: ファイルが存在する場合、コードと乖離しているセクションのみ更新する
- **ドリフト検出**: `specs/` の確認観点と prd.md のテストケースを比較し、差異を報告する

---

## 用語

| 用語 | 意味 | 例 |
|---|---|---|
| `{機能名}` | エンドポイントパスのリソース名（複数形のまま使用） | `groups` |
| `{verb-noun}` | API 操作単位の名前 | `list-groups` |

---

## 実行フロー

### Step 1: アーキテクチャ構造を把握する

`sample-api-agent` と `sample-front-agent` を**並列**で起動し、以下を報告させる。

- 使用フレームワーク・言語・ライブラリ
- 各レイヤー（handler / service / repository / domain / migration）のディレクトリパス

報告をもとにレイヤー → ディレクトリのマッピングを確定する。

---

### Step 2: テンプレートを読み込む

`.claude/skills/plan-writer/references/api-sync/templates/prd.md` を `Read` して構造を把握する。

---

### Step 3: エンドポイント一覧を収集する

Step 1 で把握した handler ディレクトリから登録済みエンドポイントを収集する。

```bash
grep -rn "e\.GET\|e\.POST\|e\.PUT\|e\.PATCH\|e\.DELETE" {handler ディレクトリ}/
```

---

### Step 4: `{機能名}` / `{verb-noun}` を自動決定する

ユーザー確認不要。以下のルールで自動決定する。

**`{機能名}`**: パスのリソース名をそのまま使う（例: `/api/v1/groups` → `groups`）

**`{verb-noun}`**:

| HTTP メソッド | パスの特徴 | verb-noun |
|---|---|---|
| `GET` | コレクション（`/groups`） | `list-{リソース}` |
| `GET` | 単体（`/groups/:id`） | `get-{リソース単数形}` |
| `POST` | コレクション | `create-{リソース単数形}` |
| `PUT` / `PATCH` | 単体 | `update-{リソース単数形}` |
| `DELETE` | 単体 | `delete-{リソース単数形}` |

例: `GET /api/v1/groups` → 機能名 `groups` / verb-noun `list-groups` / 出力先 `plans/groups/list-groups/prd.md`

---

### Step 5: 各エンドポイントのコードを読む

Step 1 のレイヤー構造に従い、handler / service / repository / domain / テストファイルを読む。

---

### Step 6: prd.md の各セクションをコードから生成する

Step 2 で読んだテンプレートの各セクションを、Step 5 で読んだコードから埋める。
`確認ステップ 5-3: DB 操作` のみ `plans/schema.md` への参照リンクに固定する。

---

### Step 7: 書き出す

書き出し先は Step 4 のマッピングに従い `plans/{機能名}/{verb-noun}/prd.md` に固定する。
存在しない場合は `Write` で新規作成、存在する場合は差分のあるセクションのみ `Edit` で更新する。手動追記は保持する。

---

### Step 8: specs とのドリフトを検出する

`specs/{機能画面}/{機能名}.md` が存在する場合、`## 確認観点` と `確認ステップ 5-5` を比較する。差異があれば報告する（自動更新しない）。

---

### Step 9: 完了を報告する

```
✅ api-sync 完了

| エンドポイント | 出力先 | 状態 |
|---|---|---|
| GET /api/v1/groups | plans/groups/list-groups/prd.md | 新規作成 / 更新 / 変更なし |

### 確認観点ドリフト
- [あり] {差異の内容}
- [なし] ドリフトなし

### 次のステップ
- 内容を確認して問題なければ `/impl` を実行してください
```
