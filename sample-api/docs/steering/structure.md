# Structure Steering

## ディレクトリ構成

```
sample-api/
├── app/
│   └── main.go          # DI 配線とサーバー起動
├── db/
│   └── migrations/      # DB schema migration
├── domain/              # コアドメイン層（フレームワーク依存ゼロ）
│   ├── *.go             # ドメインモデル（struct + json タグ）
│   └── errors.go        # センチネルエラーの一元管理
├── {feature}/           # ユースケース層（機能ごとにパッケージを作成）
│   ├── service.go       # Service struct + コンストラクタ + メソッド
│   └── service_test.go  # 外部テストパッケージ (package {feature}_test)
└── internal/
    ├── repository/
    │   └── mysql/       # Repository adapter（MySQL 実装）
    │       └── {feature}.go
    └── rest/            # Delivery 層（Echo ハンドラ）
        ├── {feature}.go       # ハンドラ + インターフェース定義 + ルート登録
        ├── {feature}_test.go  # モックを使ったハンドラテスト
        └── errors.go          # エラー → HTTP ステータスコードのマッピング
```

## 命名パターン

| 要素 | パターン | 例 |
|------|---------|-----|
| ユースケースパッケージ | 機能名（小文字） | `hello` |
| Service 型 | `Service` | `hello.Service` |
| コンストラクタ | `New{Type}` | `hello.NewService()` |
| ハンドラ型 | `{Feature}Handler` | `rest.HelloHandler` |
| ハンドラ登録関数 | `New{Feature}Handler` | `rest.NewHelloHandler(e, svc)` |
| インターフェース | `{Feature}Service` | `rest.HelloService` |

## DI パターン（app/main.go）

```go
e := echo.New()
e.Use(middleware.CORS())           // ミドルウェア登録

svc := hello.NewService()         // use case をインスタンス化
rest.NewHelloHandler(e, svc)      // delivery 層に注入してルート登録
```

新しいドメインを追加する場合はこのパターンを踏襲する。

## 新規ドメイン追加時の手順

1. `domain/{model}.go` にドメインモデルを定義
2. `{feature}/service.go` にユースケースを実装
3. `internal/repository/mysql/{feature}.go` に Repository adapter を実装
4. `internal/rest/{feature}.go` にハンドラとインターフェースを定義
5. `app/main.go` で DI 配線とルート登録を追加

詳細は `CLAUDE.md` の `/go-clean-arch` スキルを参照。
