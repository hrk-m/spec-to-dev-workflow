# spec-to-dev-workflow

`plans/` を正本として、設計合意から実装、アーキテクチャ確認、E2E、`specs/` / `docs/steering/` の最終同期までを管理するリポジトリです。

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

```text
spec-to-dev-workflow/
├── plans/                    # 設計ドキュメント・PRD の正本
│   ├── {domain}/{verb-noun}/prd.md
│   ├── shared/{task}.md
│   └── schema.md
├── specs/                    # /impl-done で同期する UX / 画面仕様成果物
├── sample-api/               # バックエンド API のサンプル実装
├── sample-front/             # フロントエンドのサンプル実装
└── e2e/                      # Playwright E2E テスト
```

## 開発プロセス

本リポジトリは **spec-to-dev-workflow エージェント** が全体を統括し、`sample-api-agent` / `sample-front-agent` に実装を委譲する構成です。ワークフローの正本は `AGENTS.md` と `.claude/rules/workflow.md` です。

```text
[開始]
  設計変更あり・新機能・バグ修正 / PRD 未整備の純粋バグ修正
    → /plan

  PRD 既存の純粋バグ修正・リファクタリングで、必要な計画が揃っている場合
    → /impl から開始可

[修正サイクル]
  /plan → /plan-writer → /plan-checker（任意）→ /impl → /arch-refactor
    ↺ 必要に応じて /plan または /impl に戻る

[最終ゲート]
  /e2e-gen → /impl-done
```

### 担当と作業場所

| フェーズ         | 主な責務                                           | 正本                             |
| ---------------- | -------------------------------------------------- | -------------------------------- |
| `/plan`          | 目的・ゴール・詳細処理フローをユーザーと合意する   | `plans/` を参照、`specs/` は補助 |
| `/plan-writer`   | 合意内容を PRD / schema に落とし込み一次整合を取る | `plans/`                         |
| `/plan-checker`  | 高リスク変更や判断が分かれる差分を最終確認する     | `plans/`                         |
| `/impl`          | PRD を正本として TDD 実装する                      | `plans/`                         |
| `/arch-refactor` | 実装をアーキテクチャ規約へ適合させる               | 実コード + context skills        |
| `/e2e-gen`       | `plans/` を最終同期して E2E を追加・検証する       | `plans/`, `e2e/`                 |
| `/impl-done`     | `docs/steering/` と `specs/` を最終同期する        | `docs/steering/`, `specs/`       |

### エージェント分担

| 対象               | 担当                              | 場所                       |
| ------------------ | --------------------------------- | -------------------------- |
| 設計・PRD          | spec-to-dev-workflow エージェント | `plans/`                   |
| API 実装           | sample-api エージェント           | `sample-api/`              |
| フロントエンド実装 | sample-front エージェント         | `sample-front/`            |
| E2E 実装           | sample-front エージェント         | `e2e/tests/`               |
| 最終仕様同期       | spec-to-dev-workflow エージェント | `specs/`, `docs/steering/` |

### 参照

- [sample-api](./sample-api/README.md)
- [sample-front](./sample-front/README.md)

## セットアップ

### ralph-loop プラグインの追加

Claude Code の Plugin スキルから `ralph-loop@claude-plugins-official` をインストールする。
`/plan-writer`、`/impl`、`/arch-refactor`、`/e2e-gen` が使用する `ralph-loop` プラグインです。

## 起動モード

このリポジトリは `local` と `docker` を分けて運用する。

- `local`: Front / API はホストで起動、DB だけ Docker
- `docker`: Front / API / DB を root の Compose でまとめて起動

### local

1. 初回だけ env ファイルを作成

```bash
cp sample-api/.env.local.example sample-api/.env.local
cp sample-front/.env.local.example sample-front/.env.local
```

1. DB を起動して初期化

```bash
cd sample-api
make docker-up
make db-setup
```

1. API / Front を別ターミナルで起動

```bash
cd sample-api && make run
cd sample-front && make run
```

- Front: `http://localhost:3000`
- API: `http://localhost:8080`
- MySQL: `localhost:3306`

### docker

```bash
make up
make down
```

- Front: `http://localhost:3001`
- API: `http://localhost:8081`
- MySQL: `localhost:3307`

Docker 側の API コンテナは起動時に migration と seed を自動実行する。

---

## スキルの使い方

### /skill-link

`sample-api` / `sample-front` のスキルを `api-context` / `front-context` にシンボリックリンクで登録する。新しいスキルをエージェントに認識させたいときに実行する。

### /guide

使うスキルに迷ったときに起動する。ワークフローを案内し、次に実行すべきステップを返す。
