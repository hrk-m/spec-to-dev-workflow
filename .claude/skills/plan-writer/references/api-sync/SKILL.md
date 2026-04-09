---
name: api-sync
description: 収束後の `/e2e-gen` 内、または `/spec-update → plans-sync` の回復時に、`sample-api/` の現コードから機能固有 PRD を生成・更新する。
---

# /api-sync — 現コードから plans/prd.md を生成・更新する

## 役割

`sample-api/` の現コードを読み取り、機能固有の `plans/{ドメイン名}/{verb-noun}/prd.md` を生成または更新する。
**通常フローでは `/e2e-gen` の内部手順としてのみ実行する。機能固有の `plans/{ドメイン名}/{verb-noun}/prd.md` が実装対象に含まれる場合のみ起動し、shared-only タスクでは起動しない。**

- **新規作成**: ファイルが存在しない場合、テンプレートをもとに生成する
- **更新**: ファイルが存在する場合、コードと乖離しているセクションのみ更新する
- **ドリフト検出**: `specs/` の確認観点と prd.md のテストケースを比較し、差異を報告する

---

## 用語

| 用語 | 意味 | 例 |
|---|---|---|
| `{ドメイン名}` | `plans/` 配下のドメインディレクトリ名（単数形） | `group` |
| `{verb-noun}` | API 操作単位の名前 | `list-groups` |

---

## 実行フロー

### Step 1: アーキテクチャ構造を把握する

`sample-api-agent` を起動し、以下を報告させる。

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

### Step 4: `{ドメイン名}` / `{verb-noun}` を自動決定する

ユーザー確認不要。以下のルールで自動決定する。

**`{ドメイン名}`**: `plans/` 配下のディレクトリ名として、パスのリソース名を単数形にしたものを使う（例: `/api/v1/groups` → `group`）

**`{verb-noun}`**:

| HTTP メソッド | パスの特徴 | verb-noun |
|---|---|---|
| `GET` | コレクション（`/groups`） | `list-{リソース}` |
| `GET` | 単体（`/groups/:id`） | `get-{リソース単数形}` |
| `POST` | コレクション | `create-{リソース単数形}` |
| `PUT` / `PATCH` | 単体 | `update-{リソース単数形}` |
| `DELETE` | 単体 | `delete-{リソース単数形}` |

例: `GET /api/v1/groups` → ドメイン名 `group` / verb-noun `list-groups` / 出力先 `plans/group/list-groups/prd.md`

---

### Step 5: 各エンドポイントのコードを読む

Step 1 のレイヤー構造に従い、handler / service / repository / domain / テストファイルを読む。

---

### Step 6: prd.md の各セクションをコードから生成する

Step 2 で読んだテンプレートの各セクションを、Step 5 で読んだコードから埋める。
`確認ステップ 5-3: DB 操作` のみ `plans/schema.md` への参照リンクに固定する。

---

### Step 7: 書き出す

書き出し先は Step 4 のマッピングに従い `plans/{ドメイン名}/{verb-noun}/prd.md` に固定する。
`plans/shared/{処理名}.md` はこのスキルの対象外とし、必要な場合は `plan-writer` 側で直接書き出す。
存在しない場合は `Write` で新規作成、存在する場合は差分のあるセクションのみ `Edit` で更新する。手動追記は保持する。

---

### Step 8: specs とのドリフトを検出する

`specs/{機能画面}/{verb-noun}.md` が存在する場合、`## 確認観点` と `確認ステップ 5-5` を比較する。差異があれば報告する（自動更新しない）。

---

### Step 9: 完了を報告する

```
✅ api-sync 完了

| エンドポイント | 出力先 | 状態 |
|---|---|---|
| GET /api/v1/groups | plans/group/list-groups/prd.md | 新規作成 / 更新 / 変更なし |

### 確認観点ドリフト
- [あり] {差異の内容}
- [なし] ドリフトなし

### 次のステップ
- `/e2e-gen` の内部手順として実行された場合: 次のステップの案内は不要（呼び出し元が制御する）
- `plans-sync` 経由で実行された場合: 呼び出し元の `plans-sync` に制御を戻す
- 単体実行の場合: このスキル単体では通常フローを進めない。通常フローなら `/e2e-gen`、例外ルートなら `/spec-update → plans-sync` から実行してください
```
