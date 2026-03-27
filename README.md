# spec-to-dev-workflow

仕様（spec）から開発（dev）へのワークフローを管理するリポジトリです。

## このリポジトリについて

実際の開発では API・フロントエンド・インフラなどのリポジトリが別々に存在することが多い。
Claude Code の `--add-dir` オプションを使うと、異なる場所にあるディレクトリを横断して 1 つのエージェントコンテキストで扱うことができる。

```bash
cd spec-to-dev-workflow
claude --add-dir ../sample-api --add-dir ../sample-front
```

あるいは、各リポジトリへのシンボリックリンクをこのディレクトリ内に作成する方法も有効。

```bash
ln -s ../sample-api ./sample-api
ln -s ../sample-front ./sample-front
```

本リポジトリはこの構成のサンプル(検証)として、`sample-api/`（API）と `sample-front/`（フロントエンド）を同一リポジトリ内に置いた状態を再現している。

## 構成

```
spec-to-dev-workflow/
├── specs/                    # 要件定義・テストコード
│   └── {機能名}/             # 大きな機能単位でディレクトリを分割
│       ├── README.md         # 機能全体の概要・要件
│       ├── create.md         # 登録処理の仕様・フロー
│       ├── update.md         # 更新処理の仕様・フロー
│       ├── list.md           # 一覧取得の仕様・フロー
│       ├── get.md            # 単件取得の仕様・フロー
│       └── delete.md         # 削除処理の仕様・フロー
├── sample-api/               # バックエンド API のサンプル実装
└── sample-front/             # フロントエンドのサンプル実装
```

## 開発プロセス

本リポジトリは **spec-to-dev-workflow エージェント** が全体を統括し、各ディレクトリの **サブエージェント** に実装を委譲する構成です。

```
spec-to-dev-workflow エージェント
├── 1. 要件定義
│   ├── 機能単位で specs/{機能名}/ ディレクトリを作成
│   ├── README.md  → 機能全体の概要・データモデル・画面フローを記述
│   └── CRUD 単位の spec ファイルを作成（create / update / list / get / delete）
│       └── 各ファイルに API エンドポイント・リクエスト/レスポンス・処理フロー・テストコードを記述
├── 2. 実装委譲         → sample-api エージェント、sample-front エージェントを起動
│   ├── sample-api エージェント    → API 実装
│   └── sample-front エージェント → フロントエンド実装
└── 3. 総合チェック     → specs/ のテスト実行・API 仕様との整合性確認
```

### 各フェーズの責務

| フェーズ | 担当 | 場所 |
|---|---|---|
| 要件定義・テストコード作成 | spec-to-dev-workflow エージェント | `specs/` |
| API 実装 | sample-api エージェント | `sample-api/` |
| フロントエンド実装 | sample-front エージェント | `sample-front/` |
| テスト実行・整合性確認 | spec-to-dev-workflow エージェント | `specs/` |

### 参照

- [sample-api](./sample-api/README.md)
- [sample-front](./sample-front/README.md)

### メモ
