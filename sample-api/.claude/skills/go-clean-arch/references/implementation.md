# 実装パターン

## ディレクトリ構造（新ドメイン追加時）

```
{domain}/
├── mocks/
│   └── FooRepository.go     ← go generate で自動生成
├── service.go               ← Service 実装 + Repository IF 宣言
└── service_test.go
internal/repository/mysql/
├── foo.go                   ← MySQL Repository 実装
└── foo_test.go
internal/rest/
├── foo.go                   ← HTTP ハンドラ + Service IF 宣言
├── foo_test.go
└── mocks/
    └── FooService.go        ← go generate で自動生成
```

---

## 1. エンティティ追加（`domain/foo.go`）

```go
package domain

import "time"

type Foo struct {
    ID        int64     `json:"id"`
    Name      string    `json:"name" validate:"required"`
    UpdatedAt time.Time `json:"updated_at"`
    CreatedAt time.Time `json:"created_at"`
}
```

センチネルエラーは `domain/errors.go` の既存定義を流用：
```go
domain.ErrNotFound / domain.ErrConflict / domain.ErrInternalServerError / domain.ErrBadParamInput
```

---

## 2. Repository Interface + Service（`foo/service.go`）

```go
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

---

## 3. MySQL Repository（`internal/repository/mysql/foo.go`）

```go
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

---

## 4. REST Handler（`internal/rest/foo.go`）

> `ResponseError`・`defaultNum`・`getStatusCode` は `internal/rest/article.go` で定義済み。再定義禁止。

```go
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

// NG 例: c.JSON(http.StatusNotFound, domain.ErrNotFound.Error()) ← 生の string は禁止
// OK 例: 必ず ResponseError{Message: ...} でラップする
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
        // Bind 失敗も必ず ResponseError{} でラップ（生の err.Error() 禁止）
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
```

---

## 5. DI 配線（`app/main.go`）

```go
fooRepo := mysqlRepo.NewFooRepository(dbConn)
fooSvc := foo.NewService(fooRepo)
rest.NewFooHandler(e, fooSvc)
```

---

## 6. 関連エンティティの並列フェッチパターン

複数レコードに紐づく関連エンティティは `errgroup` + goroutine + channel で並列取得する（`article/service.go` の `fillAuthorDetails` が実例）。

```go
func (s *Service) fillBarDetails(ctx context.Context, data []domain.Foo) ([]domain.Foo, error) {
    g, ctx := errgroup.WithContext(ctx)

    mapBars := map[int64]domain.Bar{}
    for _, f := range data {
        mapBars[f.Bar.ID] = domain.Bar{}
    }

    chanBar := make(chan domain.Bar)
    for barID := range mapBars {
        barID := barID // ループ変数をキャプチャ（Go 1.22 未満必須）
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

**ポイント**: `errgroup.WithContext` でキャンセル伝播、チャネルの close は goroutine 内で `defer`、`g.Wait()` を2回呼ぶ（チャネル受信後のエラー確認）。
