---
name: go-clean-arch
description: go-clean-arch プロジェクトの Clean Architecture パターンに従ってコードを生成・修正する。新しいドメイン（Entity / Repository / Service / Handler）を追加する際に使用。
---

# go-clean-arch アーキテクチャガイド

## ディレクトリ構造

```
.
├── Dockerfile
├── LICENSE
├── Makefile
├── README.md
├── app
│   └── main.go                         ← DI・サーバー起動のみ（薄く保つ）
├── article
│   ├── mocks
│   │   ├── ArticleRepository.go        ← mockery 自動生成（編集禁止）
│   │   └── AuthorRepository.go         ← mockery 自動生成（編集禁止）
│   ├── service.go                      ← Service（UseCase）+ Repository Interface 宣言（消費側）
│   └── service_test.go
├── article.sql                         ← テーブル定義
├── clean-arch.png
├── compose.yaml
├── domain
│   ├── article.go                      ← Article エンティティ
│   ├── author.go                       ← Author エンティティ
│   └── errors.go                       ← センチネルエラー定義
├── example.env
├── go.mod
├── go.sum
├── internal
│   ├── README.md
│   ├── repository
│   │   ├── helper.go                   ← カーソルエンコード/デコード共通処理
│   │   └── mysql
│   │       ├── article.go              ← Article MySQL Repository 実装
│   │       ├── article_test.go         ← sqlmock を使った Repository テスト
│   │       ├── author.go               ← Author MySQL Repository 実装
│   │       └── author_test.go
│   ├── rest
│   │   ├── article.go                  ← Echo HTTP ハンドラ（ResponseError・getStatusCode・defaultNum の定義元）
│   │   ├── article_test.go             ← httptest を使ったハンドラテスト
│   │   ├── middleware
│   │   │   ├── cors.go                 ← CORS ミドルウェア
│   │   │   ├── cors_test.go
│   │   │   └── timeout.go              ← リクエストタイムアウトミドルウェア
│   │   └── mocks
│   │       └── ArticleService.go       ← mockery 自動生成（編集禁止）
│   └── workers
│       └── README.md                   ← 非同期ワーカー用（未実装・拡張予定）
└── misc
    └── make
        ├── help.Makefile
        └── tools.Makefile
```

## V4 設計原則

このプロジェクトは **v4** 構造を採用しており、以下の3つの設計変更が加えられている。

### 1. インターフェースは消費側で宣言する

インターフェースを `domain/` に集約せず、**そのインターフェースを使う側のパッケージ**で宣言する（Go の暗黙的インターフェース実装を最大限活用）。

```go
// internal/rest/article.go — 消費側（Handler）がインターフェースを宣言
type ArticleService interface {
    Fetch(ctx context.Context, cursor string, num int64) ([]domain.Article, string, error)
    GetByID(ctx context.Context, id int64) (domain.Article, error)
    Update(ctx context.Context, ar *domain.Article) error
    GetByTitle(ctx context.Context, title string) (domain.Article, error)
    Store(context.Context, *domain.Article) error
    Delete(ctx context.Context, id int64) error
}
```

```go
// article/service.go — 消費側（Service）がリポジトリインターフェースを宣言
type ArticleRepository interface { ... }
type AuthorRepository interface { ... }
```

**新ドメイン追加時も同じルール**: `{domain}/service.go` にリポジトリ IF、`internal/rest/{domain}.go` にサービス IF を宣言する。

---

### 2. `internal/` パッケージで実装詳細を隠蔽

DB・REST・キャッシュなど**インフラ実装は `internal/` 配下に置く**。

- このプロジェクトが別プロジェクトからインポートされた場合、`internal/` は参照不可（Go の仕様）
- コアロジック（`domain/`・`article/`）はパブリックなまま公開される

```
internal/
  repository/mysql/   ← DB 実装（隠蔽）
  rest/               ← HTTP 実装（隠蔽）
  workers/            ← 非同期ワーカー（隠蔽・拡張予定）

domain/               ← エンティティ（公開）
article/              ← ビジネスロジック（公開）
```

---

### 3. サービス重視のパッケージ構成

`article/` パッケージは**ビジネスロジックのみ**に絞り、インフラ実装は `internal/` に分離する。

```
article/                    ← ビジネスロジックのみ
├── mocks/
│   ├── ArticleRepository.go
│   └── AuthorRepository.go
├── service.go              ← Service 実装 + Repository IF 宣言
└── service_test.go
```

---

## レイヤー構成

```
domain/          ← エンティティ + センチネルエラー定義（外部依存ゼロ）
{domain}/        ← Service（UseCase）+ Repository Interface（消費側宣言）
internal/
  repository/    ← DB アクセス実装（MySQL）← 隠蔽
  rest/          ← Echo HTTP ハンドラ + Service Interface（消費側宣言）← 隠蔽
app/main.go      ← DI 配線・サーバー起動
```

**依存方向**: `rest` → `article(Service IF)` → `domain` ← `repository`
- `domain` は何にも依存しない
- `article/service.go` は `domain` と Interface のみに依存（DB 実装を知らない）
- `internal/rest` は Service Interface に依存（Service 実装を知らない）

---

## 新ドメインの追加パターン

### 1. エンティティ追加（`domain/`）

```go
// domain/foo.go
package domain

import "time"

type Foo struct {
    ID        int64     `json:"id"`
    Name      string    `json:"name" validate:"required"`
    UpdatedAt time.Time `json:"updated_at"`
    CreatedAt time.Time `json:"created_at"`
}
```

センチネルエラーは `domain/errors.go` に既存のものを流用：
```go
domain.ErrNotFound
domain.ErrConflict
domain.ErrInternalServerError
domain.ErrBadParamInput
```

### 2. Repository Interface + Service 追加（`foo/service.go`）

```go
// foo/service.go
package foo

import (
    "context"
    "time"
    "github.com/bxcodec/go-clean-arch/domain"
)

//go:generate mockery --name FooRepository
type FooRepository interface {
    Fetch(ctx context.Context, cursor string, num int64) ([]domain.Foo, string, error)
    GetByID(ctx context.Context, id int64) (domain.Foo, error)
    Store(ctx context.Context, f *domain.Foo) error
    Update(ctx context.Context, f *domain.Foo) error
    Delete(ctx context.Context, id int64) error
}

type Service struct {
    fooRepo FooRepository
}

func NewService(r FooRepository) *Service {
    return &Service{fooRepo: r}
}

func (s *Service) Fetch(ctx context.Context, cursor string, num int64) ([]domain.Foo, string, error) {
    return s.fooRepo.Fetch(ctx, cursor, num)
}

func (s *Service) GetByID(ctx context.Context, id int64) (domain.Foo, error) {
    return s.fooRepo.GetByID(ctx, id)
}

func (s *Service) Store(ctx context.Context, f *domain.Foo) error {
    return s.fooRepo.Store(ctx, f)
}

func (s *Service) Update(ctx context.Context, f *domain.Foo) error {
    f.UpdatedAt = time.Now()
    return s.fooRepo.Update(ctx, f)
}

func (s *Service) Delete(ctx context.Context, id int64) error {
    existing, err := s.fooRepo.GetByID(ctx, id)
    if err != nil {
        return err
    }
    if existing == (domain.Foo{}) {
        return domain.ErrNotFound
    }
    return s.fooRepo.Delete(ctx, id)
}
```

### 3. MySQL Repository 追加（`internal/repository/mysql/foo.go`）

```go
// internal/repository/mysql/foo.go
package mysql

import (
    "context"
    "database/sql"
    "fmt"

    "github.com/sirupsen/logrus"
    "github.com/bxcodec/go-clean-arch/domain"
    "github.com/bxcodec/go-clean-arch/internal/repository"
)

type FooRepository struct {
    Conn *sql.DB
}

func NewFooRepository(conn *sql.DB) *FooRepository {
    return &FooRepository{conn}
}

func (m *FooRepository) fetch(ctx context.Context, query string, args ...interface{}) ([]domain.Foo, error) {
    rows, err := m.Conn.QueryContext(ctx, query, args...)
    if err != nil {
        logrus.Error(err)
        return nil, err
    }
    defer func() {
        if errRow := rows.Close(); errRow != nil {
            logrus.Error(errRow)
        }
    }()

    result := make([]domain.Foo, 0)
    for rows.Next() {
        f := domain.Foo{}
        err = rows.Scan(&f.ID, &f.Name, &f.UpdatedAt, &f.CreatedAt)
        if err != nil {
            logrus.Error(err)
            return nil, err
        }
        result = append(result, f)
    }
    return result, nil
}

func (m *FooRepository) Fetch(ctx context.Context, cursor string, num int64) ([]domain.Foo, string, error) {
    query := `SELECT id, name, updated_at, created_at FROM foo WHERE created_at > ? ORDER BY created_at LIMIT ?`

    decodedCursor, err := repository.DecodeCursor(cursor)
    if err != nil && cursor != "" {
        return nil, "", domain.ErrBadParamInput
    }

    res, err := m.fetch(ctx, query, decodedCursor, num)
    if err != nil {
        return nil, "", err
    }

    var nextCursor string
    if len(res) == int(num) {
        nextCursor = repository.EncodeCursor(res[len(res)-1].CreatedAt)
    }
    return res, nextCursor, nil
}

func (m *FooRepository) GetByID(ctx context.Context, id int64) (domain.Foo, error) {
    query := `SELECT id, name, updated_at, created_at FROM foo WHERE id = ?`
    list, err := m.fetch(ctx, query, id)
    if err != nil {
        return domain.Foo{}, err
    }
    if len(list) == 0 {
        return domain.Foo{}, domain.ErrNotFound
    }
    return list[0], nil
}

func (m *FooRepository) Store(ctx context.Context, f *domain.Foo) error {
    query := `INSERT foo SET name=?, updated_at=?, created_at=?`
    stmt, err := m.Conn.PrepareContext(ctx, query)
    if err != nil {
        return err
    }
    defer stmt.Close()

    res, err := stmt.ExecContext(ctx, f.Name, f.UpdatedAt, f.CreatedAt)
    if err != nil {
        return err
    }
    lastID, err := res.LastInsertId()
    if err != nil {
        return err
    }
    f.ID = lastID
    return nil
}

func (m *FooRepository) Update(ctx context.Context, f *domain.Foo) error {
    query := `UPDATE foo SET name=?, updated_at=? WHERE id = ?`
    stmt, err := m.Conn.PrepareContext(ctx, query)
    if err != nil {
        return err
    }
    defer stmt.Close()

    res, err := stmt.ExecContext(ctx, f.Name, f.UpdatedAt, f.ID)
    if err != nil {
        return err
    }
    affected, err := res.RowsAffected()
    if err != nil {
        return err
    }
    if affected != 1 {
        return fmt.Errorf("weird behavior. Total Affected: %d", affected)
    }
    return nil
}

func (m *FooRepository) Delete(ctx context.Context, id int64) error {
    query := `DELETE FROM foo WHERE id = ?`
    stmt, err := m.Conn.PrepareContext(ctx, query)
    if err != nil {
        return err
    }
    defer stmt.Close()

    res, err := stmt.ExecContext(ctx, id)
    if err != nil {
        return err
    }
    affected, err := res.RowsAffected()
    if err != nil {
        return err
    }
    if affected != 1 {
        return fmt.Errorf("weird behavior. Total Affected: %d", affected)
    }
    return nil
}
```

### 4. REST Handler 追加（`internal/rest/foo.go`）

> **注意**: `ResponseError`・`defaultNum`・`getStatusCode` は `internal/rest/article.go` で定義済みの共有シンボル。
> 同パッケージ内から直接使用でき、**再定義禁止**（コンパイルエラーになる）。

```go
// internal/rest/foo.go
package rest

import (
    "context"
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
    validator "gopkg.in/go-playground/validator.v9"

    "github.com/bxcodec/go-clean-arch/domain"
)

//go:generate mockery --name FooService
type FooService interface {
    Fetch(ctx context.Context, cursor string, num int64) ([]domain.Foo, string, error)
    GetByID(ctx context.Context, id int64) (domain.Foo, error)
    Store(ctx context.Context, f *domain.Foo) error
    Update(ctx context.Context, f *domain.Foo) error
    Delete(ctx context.Context, id int64) error
}

type FooHandler struct {
    Service FooService
}

func NewFooHandler(e *echo.Echo, svc FooService) {
    h := &FooHandler{Service: svc}
    e.GET("/foos", h.Fetch)
    e.POST("/foos", h.Store)
    e.GET("/foos/:id", h.GetByID)
    e.PUT("/foos/:id", h.Update)
    e.DELETE("/foos/:id", h.Delete)
}

func (h *FooHandler) Fetch(c echo.Context) error {
    numS := c.QueryParam("num")
    num, err := strconv.Atoi(numS)
    if err != nil || num == 0 {
        num = defaultNum
    }
    cursor := c.QueryParam("cursor")
    ctx := c.Request().Context()

    list, nextCursor, err := h.Service.Fetch(ctx, cursor, int64(num))
    if err != nil {
        return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
    }
    c.Response().Header().Set("X-Cursor", nextCursor)
    return c.JSON(http.StatusOK, list)
}

func (h *FooHandler) GetByID(c echo.Context) error {
    idP, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return c.JSON(http.StatusNotFound, ResponseError{Message: domain.ErrNotFound.Error()})
    }
    ctx := c.Request().Context()
    foo, err := h.Service.GetByID(ctx, int64(idP))
    if err != nil {
        return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
    }
    return c.JSON(http.StatusOK, foo)
}

func (h *FooHandler) Store(c echo.Context) error {
    var f domain.Foo
    if err := c.Bind(&f); err != nil {
        return c.JSON(http.StatusUnprocessableEntity, ResponseError{Message: err.Error()})
    }
    if ok, err := isFooRequestValid(&f); !ok {
        return c.JSON(http.StatusBadRequest, ResponseError{Message: err.Error()})
    }
    ctx := c.Request().Context()
    if err := h.Service.Store(ctx, &f); err != nil {
        return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
    }
    return c.JSON(http.StatusCreated, f)
}

func (h *FooHandler) Update(c echo.Context) error {
    idP, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return c.JSON(http.StatusNotFound, ResponseError{Message: domain.ErrNotFound.Error()})
    }
    var f domain.Foo
    if err := c.Bind(&f); err != nil {
        return c.JSON(http.StatusUnprocessableEntity, ResponseError{Message: err.Error()})
    }
    f.ID = int64(idP)
    ctx := c.Request().Context()
    if err := h.Service.Update(ctx, &f); err != nil {
        return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
    }
    return c.JSON(http.StatusOK, f)
}

func (h *FooHandler) Delete(c echo.Context) error {
    idP, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        return c.JSON(http.StatusNotFound, ResponseError{Message: domain.ErrNotFound.Error()})
    }
    ctx := c.Request().Context()
    if err := h.Service.Delete(ctx, int64(idP)); err != nil {
        return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
    }
    return c.NoContent(http.StatusNoContent)
}

// バリデーション関数はドメインごとに定義（isRequestValid は *domain.Article 専用のため流用不可）
func isFooRequestValid(f *domain.Foo) (bool, error) {
    validate := validator.New()
    if err := validate.Struct(f); err != nil {
        return false, err
    }
    return true, nil
}

// getStatusCode・ResponseError・defaultNum は article.go の共有シンボルを使用
// → 再定義しないこと
```

### 5. DI 配線（`app/main.go` に追記）

```go
fooRepo := mysqlRepo.NewFooRepository(dbConn)
fooSvc := foo.NewService(fooRepo)
rest.NewFooHandler(e, fooSvc)
```

---

## 関連エンティティの並列フェッチパターン

複数レコードに紐づく関連エンティティを取得する場合、`errgroup` + goroutine + channel のパイプラインパターンを使う（`article/service.go` の `fillAuthorDetails` が実例）。

```go
// 例: Fetch で取得した各 Foo に紐づく Bar を並列取得する場合
func (s *Service) fillBarDetails(ctx context.Context, data []domain.Foo) ([]domain.Foo, error) {
    g, ctx := errgroup.WithContext(ctx)

    // 重複排除しつつ ID を収集
    mapBars := map[int64]domain.Bar{}
    for _, f := range data {
        mapBars[f.Bar.ID] = domain.Bar{}
    }

    chanBar := make(chan domain.Bar)
    for barID := range mapBars {
        barID := barID // ループ変数をキャプチャ
        g.Go(func() error {
            res, err := s.barRepo.GetByID(ctx, barID)
            if err != nil {
                return err
            }
            chanBar <- res
            return nil
        })
    }

    go func() {
        defer close(chanBar)
        if err := g.Wait(); err != nil {
            logrus.Error(err)
        }
    }()

    for bar := range chanBar {
        if bar != (domain.Bar{}) {
            mapBars[bar.ID] = bar
        }
    }

    if err := g.Wait(); err != nil {
        return nil, err
    }

    for i, f := range data {
        if b, ok := mapBars[f.Bar.ID]; ok {
            data[i].Bar = b
        }
    }
    return data, nil
}
```

**ポイント**:
- `errgroup.WithContext` でキャンセル伝播
- ループ変数は `barID := barID` でキャプチャ（Go 1.22 未満必須）
- チャネルの close は goroutine 内で `defer close(chanBar)`
- `g.Wait()` を2回呼ぶ（1回目はチャネル送受信後のエラー確認）

---

## Mock 生成

Service 層・Handler 層のインターフェース宣言に以下を付与し、`go generate` で自動生成：

```go
//go:generate mockery --name FooRepository   // foo/service.go に記述
//go:generate mockery --name FooService      // internal/rest/foo.go に記述
```

```bash
go generate ./foo/...
go generate ./internal/rest/...
```

生成物（`mocks/` 配下）は **手動編集禁止**。

---

## テストパターン

### Service テスト（`foo/service_test.go`）

```go
func TestFooGetByID(t *testing.T) {
    mockRepo := new(mocks.FooRepository)
    mockFoo := domain.Foo{ID: 1, Name: "test"}

    t.Run("success", func(t *testing.T) {
        mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("int64")).
            Return(mockFoo, nil).Once()

        svc := foo.NewService(mockRepo)
        result, err := svc.GetByID(context.TODO(), 1)

        assert.NoError(t, err)
        assert.Equal(t, mockFoo, result)
        mockRepo.AssertExpectations(t)
    })
}
```

### Repository テスト（`internal/repository/mysql/foo_test.go`）

```go
func TestGetFooByID(t *testing.T) {
    db, mock, err := sqlmock.New()
    require.NoError(t, err)

    rows := sqlmock.NewRows([]string{"id", "name", "updated_at", "created_at"}).
        AddRow(1, "test", time.Now(), time.Now())

    query := "SELECT id, name, updated_at, created_at FROM foo WHERE id = \\?"
    mock.ExpectQuery(query).WillReturnRows(rows)

    repo := mysqlRepo.NewFooRepository(db)
    result, err := repo.GetByID(context.TODO(), 1)

    assert.NoError(t, err)
    assert.Equal(t, int64(1), result.ID)
}
```

### Handler テスト（`internal/rest/foo_test.go`）

```go
func TestFooGetByID(t *testing.T) {
    var mockFoo domain.Foo
    faker.FakeData(&mockFoo)

    mockSvc := new(mocks.FooService)
    mockSvc.On("GetByID", mock.Anything, int64(mockFoo.ID)).Return(mockFoo, nil)

    e := echo.New()
    req, _ := http.NewRequestWithContext(context.TODO(), echo.GET,
        "/foos/"+strconv.Itoa(int(mockFoo.ID)), strings.NewReader(""))
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)
    c.SetParamNames("id")
    c.SetParamValues(strconv.Itoa(int(mockFoo.ID)))

    h := rest.FooHandler{Service: mockSvc}
    err := h.GetByID(c)

    require.NoError(t, err)
    assert.Equal(t, http.StatusOK, rec.Code)
    mockSvc.AssertExpectations(t)
}
```

---

## 重要なルール

| ルール | 理由 |
|--------|------|
| Service は Repository Interface に依存（MySQL 実装を知らない） | DIP・テスト容易性 |
| Handler は Service Interface に依存 | 同上 |
| `domain/` パッケージは外部依存ゼロ | エンティティの安定性 |
| PreparedStatement は必ず `defer stmt.Close()` | リソースリーク防止 |
| エラーレスポンスは必ず `ResponseError{Message: ...}` | レスポンス形式統一 |
| `getStatusCode`・`ResponseError`・`defaultNum` は再定義禁止 | `rest` パッケージ共有済み、重複でコンパイルエラー |
| バリデーション関数はドメインごとに定義（`isRequestValid` は `*domain.Article` 専用） | シグネチャ不一致でコンパイルエラー |
| 関連エンティティの並列取得は `errgroup` + goroutine + channel | `fillAuthorDetails` パターンを踏襲 |
| Mock は `go generate` で自動生成（手動編集禁止） | 実装と乖離防止 |
| カーソルは `repository.EncodeCursor` / `DecodeCursor` で統一 | Base64+時刻フォーマット統一 |
| 時刻フィールドは `time.Time` で統一 | 型安全性（`string` 使用禁止） |

---

## エラーハンドリングフロー

```
Handler → getStatusCode(err) → HTTP ステータスコード
  domain.ErrNotFound          → 404
  domain.ErrConflict          → 409
  domain.ErrInternalServerError → 500
  その他                       → 500
```

センチネルエラーは `domain/errors.go` で一元管理。新しいエラーが必要な場合もここに追加。
