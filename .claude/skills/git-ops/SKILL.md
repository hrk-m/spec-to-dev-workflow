---
name: git-ops
description: >
  ブランチ作成からコミット・プッシュ・PR 作成まで一気通貫（フロー A）、または既存ブランチへの差分コミット・プッシュのみ（フロー B）を 3 リポジトリ（spec-to-dev-workflow / sample-api / sample-front）横断で処理する。手動起動専用。
allowed-tools: Bash, AskUserQuestion
---

# /git-ops — Git 横断操作スキル

3 リポジトリ（親: `spec-to-dev-workflow`、サブモジュール: `sample-api` / `sample-front`）の git 操作を一貫して処理する。

## 制約

- PR のマージは行わない（GitHub 上でユーザーが手動マージ）
- コミットメッセージは差分から Claude が自動生成してそのまま実行する（ユーザー確認なし）
- `main` への直接コミットはフロー A・B ともに禁止

---

## 0. 操作の選択

`AskUserQuestion`（単一選択）で操作を確認する。

- **A. ブランチ作成 + コミット + プッシュ + PR 作成** — feature ブランチを作成し、変更をコミット・プッシュ後に PR を作成する
- **B. 差分コミット + プッシュ** — 現在のブランチに差分をコミット・プッシュする（ブランチ作成・PR 不要）

選択に応じてフロー A またはフロー B へ進む。

## 0-1. 対象リポジトリの選択

`AskUserQuestion`（複数選択）で処理対象のリポジトリを確認する。

- **spec-to-dev-workflow**（親リポジトリ）
- **sample-api**（サブモジュール）
- **sample-front**（サブモジュール）

選択されたリポジトリのみを以降のステップで処理する。選択されなかったリポジトリは完全にスキップする。

---

## フロー A: ブランチ作成 + コミット + プッシュ + PR 作成

### A-1. ブランチ名の確認

`AskUserQuestion` でブランチ名を入力させる。

- 形式: `feature/{機能名}`（例: `feature/add-login`）
- 既存ブランチ名と重複していないか事前に確認する

```bash
git -C . branch -a
git -C sample-api branch -a
git -C sample-front branch -a
```

### A-2. 対象リポジトリの変更状態確認

0-1 で選択されたリポジトリの変更状態を確認する。変更がないリポジトリはスキップ対象として明示する。

```bash
# 選択されたリポジトリのみ実行する
git -C . status --short            # spec-to-dev-workflow が選択された場合
git -C sample-api status --short   # sample-api が選択された場合
git -C sample-front status --short # sample-front が選択された場合
```

### A-3. ブランチ作成

変更があるリポジトリそれぞれでブランチを作成する。サブモジュールを先に作成し、親リポジトリを最後に作成する。

```bash
# サブモジュール（選択されたものだけ）
git -C sample-api checkout -b {ブランチ名}
git -C sample-front checkout -b {ブランチ名}

# 親リポジトリ（選択された場合）
git checkout -b {ブランチ名}
```

### A-4. lint + ユニットテスト確認・自動修正

ブランチ作成直後、コミット前に lint とユニットテストを実行する。

```bash
# sample-api（対象の場合）
make -C sample-api lint
make -C sample-api test

# sample-front（対象の場合）
make -C sample-front check
```

**全 pass の場合** → A-5 へ進む。

**失敗した場合** → 自動修正を試みる。

```bash
# sample-api
make -C sample-api fix

# sample-front
make -C sample-front fix
```

修正後、再度 lint + テストを実行して pass を確認する。pass したら A-5 へ進む（修正内容は元の変更と一緒に 1 コミットにまとめる）。

**自動修正後も失敗する場合** → 失敗内容を提示してスキルを停止する（コミット・PR は作成しない）。

### A-5. コミットメッセージの自動生成 + コミット + プッシュ

A-4 で確認・修正済みの変更をまとめてコミットする。サブモジュールを先に処理し、親リポジトリを最後に処理する。

```bash
git -C {リポジトリパス} diff
git -C {リポジトリパス} diff --cached
git -C {リポジトリパス} status --short
```

| prefix | 使用場面 |
|---|---|
| `feat:` | 新機能の追加 |
| `fix:` | バグ修正 |
| `refactor:` | 動作変更を伴わないリファクタリング |
| `test:` | テストの追加・修正 |
| `docs:` | ドキュメントのみの変更 |
| `chore:` | ビルド・設定・依存関係の変更 |

```bash
git -C {リポジトリパス} add -A
git -C {リポジトリパス} commit -m "{自動生成メッセージ}"
git -C {リポジトリパス} push -u origin {ブランチ名}
```

---

### A-6. PR 作成

A-5 でプッシュした全リポジトリに PR を作成する。PR タイトルは直近のコミットメッセージを使用する。**サブモジュールを先に作成し、取得した URL を親リポジトリの PR body に含めてから親リポジトリを最後に作成する。**

```bash
git -C {リポジトリパス} log -1 --pretty=%s
```

```bash
# sample-api（対象の場合）— URL を変数に保存する
API_PR_URL=$(gh pr create \
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
)")

# sample-front（対象の場合）— URL を変数に保存する
FRONT_PR_URL=$(gh pr create \
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
)")
```

サブモジュールの PR URL を収集したら、親リポジトリの PR を作成する。`## 関連 PR` セクションには対象だったサブモジュールの URL のみ列挙し、スキップしたリポジトリの行は省略する。

```bash
# 親リポジトリ（対象の場合）
gh pr create \
  --base main \
  --head {ブランチ名} \
  --title "{PRタイトル}" \
  --body "$(cat <<EOF
## 変更内容
{変更の概要}

## 関連 PR
- sample-api: ${API_PR_URL}   # sample-api が対象の場合のみ
- sample-front: ${FRONT_PR_URL}   # sample-front が対象の場合のみ
EOF
)"
```

作成した全 PR の URL を一覧で提示してスキルを完了する。

---

## フロー B: 差分コミット + プッシュ

### B-1. 現在のブランチ確認

0-1 で選択されたリポジトリのブランチ状態を確認する。

```bash
# 選択されたリポジトリのみ実行する
git -C . branch --show-current            # spec-to-dev-workflow が選択された場合
git -C sample-api branch --show-current   # sample-api が選択された場合
git -C sample-front branch --show-current # sample-front が選択された場合
```

**停止条件**: 選択されたリポジトリのいずれかが `main` にいる かつ そのリポジトリに変更がある場合は即停止し、フロー A を先に実行するよう案内する。

### B-2. 対象リポジトリの変更状態確認

0-1 で選択されたリポジトリの変更状態を確認する。変更がないリポジトリはスキップ対象として明示する。

```bash
# 選択されたリポジトリのみ実行する
git -C . status --short            # spec-to-dev-workflow が選択された場合
git -C sample-api status --short   # sample-api が選択された場合
git -C sample-front status --short # sample-front が選択された場合
```

### B-3. コミットメッセージの自動生成 + コミット + プッシュ

各リポジトリの変更内容を取得し、conventional commit 形式でメッセージを自動生成してそのまま実行する。サブモジュールを先に処理し、親リポジトリを最後に処理する。

```bash
git -C {リポジトリパス} diff
git -C {リポジトリパス} diff --cached
git -C {リポジトリパス} status --short
```

```bash
git -C {リポジトリパス} add -A
git -C {リポジトリパス} commit -m "{自動生成メッセージ}"
git -C {リポジトリパス} push origin {現在のブランチ名}
```

完了後、各リポジトリのプッシュ結果（ブランチ名・コミットハッシュ）を一覧で提示してスキルを完了する。

---

## エラーハンドリング

| 状況 | 対応 |
|---|---|
| フロー A 開始時にブランチ名が既存と重複 | 別名を入力させる |
| lint / テスト失敗かつ自動修正後も失敗 | 失敗内容を提示してスキルを停止（PR 作成しない） |
| フロー B 開始時に変更ありリポジトリが `main` | 即停止。フロー A を先に実行するよう案内する |
| PR が既に存在する（`gh pr create` がエラー） | `gh pr list --head {ブランチ名}` で既存 PR の URL を取得して提示し、続行する |
| `git push` が rejected | `git -C {パス} pull --rebase origin {ブランチ名}` を提案し、ユーザー確認後に実行する |
| 変更がないリポジトリ | 候補から除外してスキップし、その旨を明示する |
