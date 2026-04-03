# Structure Steering

## ディレクトリ構成

```
sample-api/
├── app/
│   └── main.go              # DI 配線とサーバー起動
├── db/
│   └── migrations/          # DB schema migration
├── domain/                  # コアドメイン層（フレームワーク依存ゼロ）
│   ├── *.go                 # ドメインモデル（struct + json タグ）
│   └── errors.go            # センチネルエラーの一元管理
├── {feature}/               # ユースケース層（機能ごとにパッケージを作成）
│   ├── service.go           # Service struct + コンストラクタ + メソッド
│   ├── service_test.go      # 外部テストパッケージ (package {feature}_test)
│   └── mocks/               # テスト用 mock（手動保守）
│       └── {feature}_repository_mock.go
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
├── .env                     # 環境変数（ローカル用）
├── .env.example             # 環境変数のサンプル
├── .golangci.yml            # golangci-lint 設定
├── bin/                     # ビルド成果物
├── docker-compose.yml       # MySQL コンテナ定義
├── Makefile                 # ビルド・テスト・lint コマンド
└── README.md                # プロジェクト説明
```

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
groupRepo := mysql.NewGroupRepository(db)
gSvc := group.NewService(groupRepo)
rest.NewGroupHandler(e, gSvc)
```

新しいドメインを追加する場合は group パターン（Repository → Service → Handler）を踏襲する。

## 新規ドメイン追加時の手順

1. `domain/{model}.go` にドメインモデルを定義
2. `{feature}/service.go` にユースケースを実装
3. `internal/repository/mysql/{feature}.go` に Repository adapter を実装
4. `internal/rest/{feature}.go` にハンドラとインターフェースを定義
5. `app/main.go` で DI 配線とルート登録を追加

詳細は `CLAUDE.md` の `/go-clean-arch` スキルを参照。
