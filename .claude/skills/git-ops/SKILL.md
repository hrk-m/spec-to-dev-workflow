---
name: git-ops
description: >
  ブランチ作成からコミット・プッシュ（フロー A）、または PR 作成・サブモジュール更新（フロー B）を 3 リポジトリ（spec-to-dev-workflow / sample-api / sample-front）横断で処理する。手動起動専用。
allowed-tools: Bash, AskUserQuestion
---

# /git-ops — Git 横断操作スキル

3 リポジトリ（親: `spec-to-dev-workflow`、サブモジュール: `sample-api` / `sample-front`）の git 操作を一貫して処理する。

## 制約

- PR のマージは行わない（GitHub 上でユーザーが手動マージ）
- コミットメッセージは差分から Claude が生成し、ユーザーが確認してから実行する
- `main` への直接コミットはフロー B で禁止（フロー B 開始時に親リポジトリが feature ブランチにいることを確認する）

---

## 0. 操作の選択

`AskUserQuestion`（単一選択）で操作を確認する。

- **A. ブランチ作成 + コミット + プッシュ** — feature ブランチを作成し、変更をコミット・プッシュする
- **B. PR 作成 + サブモジュール更新** — フロー A 完了後に PR を作成し、マージ後にサブモジュールを更新する

選択に応じてフロー A またはフロー B へ進む。

---

## フロー A: ブランチ作成 + コミット + プッシュ

### A-1. ブランチ名の確認

`AskUserQuestion` でブランチ名を入力させる。

- 形式: `feature/{機能名}`（例: `feature/add-login`）
- 既存ブランチ名と重複していないか事前に確認する

```bash
git -C . branch -a
git -C sample-api branch -a
git -C sample-front branch -a
```

### A-2. 対象リポジトリの自動検出

3 リポジトリの変更状態を確認し、変更があるリポジトリだけをブランチ作成・コミット対象とする。

```bash
git -C . status --short
git -C sample-api status --short
git -C sample-front status --short
```

変更があるリポジトリを一覧で提示する（変更なしのリポジトリはスキップ対象として明示する）。

### A-3. ブランチ作成

変更があるリポジトリそれぞれでブランチを作成する。サブモジュールを先に作成し、親リポジトリを最後に作成する。

```bash
# サブモジュール（選択されたものだけ）
git -C sample-api checkout -b {ブランチ名}
git -C sample-front checkout -b {ブランチ名}

# 親リポジトリ（選択された場合）
git checkout -b {ブランチ名}
```

### A-4. コミットメッセージの生成・確認

選択したリポジトリそれぞれの変更内容を取得してコミットメッセージを生成する。
ブランチ作成直後は HEAD が変わっていないため、ワーキングディレクトリの差分と未追跡ファイルを取得する。

```bash
# 未ステージの変更
git -C {リポジトリパス} diff

# ステージ済みの変更
git -C {リポジトリパス} diff --cached

# 未追跡ファイルを含む全体の状態
git -C {リポジトリパス} status --short
```

conventional commit 形式でメッセージを生成する。

| prefix | 使用場面 |
|---|---|
| `feat:` | 新機能の追加 |
| `fix:` | バグ修正 |
| `refactor:` | 動作変更を伴わないリファクタリング |
| `test:` | テストの追加・修正 |
| `docs:` | ドキュメントのみの変更 |
| `chore:` | ビルド・設定・依存関係の変更 |

`AskUserQuestion` でリポジトリごとのメッセージを提示し、確認を取る。

- **OK** → そのまま使用
- **修正** → 修正内容を入力させて反映

### A-5. コミット + プッシュ

確認が取れたリポジトリから順に実行する。サブモジュールを先に処理し、親リポジトリを最後に処理する。

```bash
git -C {リポジトリパス} add -A
git -C {リポジトリパス} commit -m "{確認済みメッセージ}"
git -C {リポジトリパス} push -u origin {ブランチ名}
```

完了後、各リポジトリのプッシュ結果（ブランチ名・コミットハッシュ）を一覧で提示してスキルを完了する。

---

## フロー B: PR 作成 + サブモジュール更新

### B-1. 事前チェック

親リポジトリのブランチを確認する。

```bash
git -C . branch --show-current
```

**停止条件**: 親リポジトリが `main` にいる場合は即停止し、フロー A を先に実行するよう案内する。

変更がプッシュ済みのサブモジュールを特定する（フロー A で処理したリポジトリ）。

```bash
git -C sample-api branch --show-current
git -C sample-front branch --show-current
```

feature ブランチにいるサブモジュールだけを以降の処理対象とする。`main` にいるサブモジュールは変更がないとみなしてスキップする。

### B-2. サブモジュールの PR 作成

B-1 で特定したサブモジュール（feature ブランチにいるもの）に PR を作成する。

PR タイトルは直近のコミットメッセージを使用する。

```bash
git -C {リポジトリパス} log -1 --pretty=%s
```

```bash
# sample-api（対象の場合）
gh pr create \
  --repo hrk-m/spec-to-sample-api \
  --base main \
  --head {ブランチ名} \
  --title "{PRタイトル}" \
  --body "$(cat <<'EOF'
## 変更内容
{変更の概要}

## 関連
spec-to-dev-workflow の実装による変更
EOF
)"

# sample-front（対象の場合）
gh pr create \
  --repo hrk-m/spec-to-sample-front \
  --base main \
  --head {ブランチ名} \
  --title "{PRタイトル}" \
  --body "$(cat <<'EOF'
## 変更内容
{変更の概要}

## 関連
spec-to-dev-workflow の実装による変更
EOF
)"
```

作成した PR の URL を一覧で提示する。

`AskUserQuestion` で一時停止する:

> 上記の PR を GitHub でマージしてください。マージが完了したら「完了」と入力してください。

### B-3. マージ後: 対象サブモジュールを main に同期

B-2 で PR を作成したサブモジュールのみ実行する。

```bash
git -C {リポジトリパス} checkout main
git -C {リポジトリパス} pull origin main
```

### B-4. 親リポジトリのコミット + プッシュ

B-3 で同期したサブモジュールのポインタ更新と、親リポジトリに残る未コミット変更をまとめてコミットする。

```bash
git -C . add -A
git -C . status --short
```

差分からコミットメッセージを生成し、`AskUserQuestion` で確認を取る。

```bash
git -C . commit -m "{確認済みメッセージ}"
git -C . push -u origin {ブランチ名}
```

### B-5. 親リポジトリの PR 作成

```bash
# B-3 で同期済みサブモジュールの最新コミットハッシュを取得
git -C sample-api rev-parse HEAD   # 対象の場合
git -C sample-front rev-parse HEAD  # 対象の場合

gh pr create \
  --base main \
  --head {ブランチ名} \
  --title "{PRタイトル}" \
  --body "$(cat <<'EOF'
## 変更内容
{変更の概要}

## サブモジュール更新
- sample-api: {コミットハッシュ}（対象の場合）
- sample-front: {コミットハッシュ}（対象の場合）
EOF
)"
```

PR の URL を提示してスキルを完了する。

---

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| フロー B 開始時に親リポジトリが `main` | 即停止。フロー A を先に実行するよう案内する |
| PR が既に存在する（`gh pr create` がエラー） | `gh pr list --head {ブランチ名}` で既存 PR の URL を取得して提示し、続行する |
| `git push` が rejected | `git -C {パス} pull --rebase origin {ブランチ名}` を提案し、ユーザー確認後に実行する |
| 変更がないリポジトリ | A-2 で候補から除外してスキップし、その旨を明示する |
