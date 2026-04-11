# Structure Steering

## ディレクトリ構成

```
sample-api/
├── app/
│   └── main.go              # DI 配線とサーバー起動
├── db/
│   ├── migrate/             # DB schema migration (golang-migrate, .up.sql のみ)
│   └── seed/                # 初期データ・開発用データ (DML のみ)
├── domain/                  # コアドメイン層（フレームワーク依存ゼロ）
│   ├── *.go                 # ドメインモデル（struct + json タグ）
│   └── errors.go            # センチネルエラーの一元管理
├── {feature}/               # ユースケース層（機能ごとにパッケージを作成）
│   ├── service.go           # Service struct + コンストラクタ + メソッド
│   ├── service_test.go      # 外部テストパッケージ (package {feature}_test)
│   └── mocks/               # テスト用 mock（手動保守）
│       ├── {feature}_repository_mock.go
│       └── user_repository_mock.go  # 複数の repository IF を持つ場合（例: group は UserRepository も必要）
├── internal/
│   ├── repository/
│   │   └── mysql/           # Repository adapter（MySQL 実装）
│   │       ├── {feature}.go
│   │       └── {feature}_test.go
│   └── rest/                # Delivery 層（Echo ハンドラ）
│       ├── {feature}.go       # ハンドラ + インターフェース定義 + ルート登録
│       ├── {feature}_test.go  # モックを使ったハンドラテスト
│       ├── errors.go          # エラー → HTTP ステータスコードのマッピング
│       └── mocks/             # テスト用 mock（手動保守）
│           └── {feature}_service_mock.go
├── .env.local               # 環境変数（ローカル用、git ignore）
├── .env.local.example       # ローカル環境変数のサンプル
├── .env.docker.example      # Docker 用環境変数のサンプル
├── .golangci.yml            # golangci-lint 設定
├── bin/                     # ビルド成果物
├── docker-compose.yml       # ローカル開発用 MySQL コンテナ定義
├── entrypoint.sh            # Docker API 起動前の migration / seed
├── Makefile                 # ビルド・テスト・lint コマンド
└── README.md                # プロジェクト説明
```

例: `group/`, `user/`

## 命名パターン

| 要素 | パターン | 例 |
|------|---------|-----|
| ユースケースパッケージ | 機能名（小文字） | `group` |
| Service 型 | `Service` | `group.Service` |
| コンストラクタ | `New{Type}` | `group.NewService(repo)` |
| ハンドラ型 | `{Feature}Handler` | `rest.GroupHandler` |
| ハンドラ登録関数 | `New{Feature}Handler` | `rest.NewGroupHandler(e, svc)` |
| Service IF（rest 側） | `{Feature}Service` | `rest.GroupService` |
| Repository IF（feature 側） | `{Feature}Repository` | `group.GroupRepository` |
| Repository 実装 | `{Feature}Repository` | `mysql.GroupRepository` |
| テスト用 mock 型 | `Mock{Feature}{IF}` | `mocks.MockGroupRepository`, `mocks.MockGroupService` |

## DI パターン（app/main.go）

```go
e := echo.New()
e.Use(middleware.CORS())           // ミドルウェア登録

// group: repository → service → handler の標準パターン
// GroupService は GroupRepository と UserRepository の両方を受け取る
groupRepo := mysql.NewGroupRepository(db)
userRepo := mysql.NewUserRepository(db)
gSvc := group.NewService(groupRepo, userRepo)
rest.NewGroupHandler(e, gSvc)

// user: user 一覧の標準パターン
uSvc := user.NewService(userRepo)
rest.NewUserHandler(e, uSvc)
```

新しいドメインを追加する場合は group パターン（Repository → Service → Handler）を踏襲する。

> **補足**: `mysql.UserRepository` は `group.UserRepository` と `user.UserRepository` の両インターフェースを実装している。複数のサービスから共有されるリポジトリ実装は 1 つのインスタンスを共有して DI する。

## 新規ドメイン追加時の手順

1. `domain/{model}.go` にドメインモデルを定義
2. `{feature}/service.go` にユースケースを実装
3. `internal/repository/mysql/{feature}.go` に Repository adapter を実装
4. `internal/rest/{feature}.go` にハンドラとインターフェースを定義
5. `app/main.go` で DI 配線とルート登録を追加

詳細は `CLAUDE.md` の `/go-clean-arch` スキルを参照。
