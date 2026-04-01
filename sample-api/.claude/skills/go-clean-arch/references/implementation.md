# 実装パターン

> このファイルはテンプレート。最終的には対象パッケージの既存コードを正とする。

## ディレクトリ構造

```text
{domain}/
├── mocks/
│   └── FooRepository.go   ← 手動作成・手動保守
├── service.go
└── service_test.go
internal/repository/mysql/
├── foo.go
└── foo_test.go
internal/rest/
├── foo.go
├── foo_test.go
└── mocks/
    └── FooService.go      ← 手動作成・手動保守
```

---

## 1. Entity（`domain/foo.go`）

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

補足:

- 新規 timestamp は `time.Time` を優先
- 既存 entity の legacy な型は、移行タスクでない限り維持
- センチネルエラーは `domain/errors.go` に寄せる

---

## 2. Service + Repository IF（`foo/service.go`）

```go
package foo

import (
	"context"
	"time"

	"github.com/bxcodec/go-clean-arch/domain"
)

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

補足:

- IF は消費側で宣言
- service 層は adapter 実装を import しない
- `time.Now()` 更新のような薄いユースケースロジックは service に置く
- repository mock は `mocks/` 配下に手動作成する

---

## 3. Repository Adapter（`internal/repository/mysql/foo.go`）

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
	return &FooRepository{Conn: conn}
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
		item := domain.Foo{}
		err = rows.Scan(&item.ID, &item.Name, &item.UpdatedAt, &item.CreatedAt)
		if err != nil {
			logrus.Error(err)
			return nil, err
		}
		result = append(result, item)
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

func (m *FooRepository) Store(ctx context.Context, f *domain.Foo) error {
	query := `INSERT foo SET name=?, updated_at=?, created_at=?`
	stmt, err := m.Conn.PrepareContext(ctx, query)
	if err != nil {
		return err
	}

	// stmt.Close() の扱いは対象ファイルの既存パターンに合わせる。
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

	res, err := stmt.ExecContext(ctx, f.Name, f.UpdatedAt, f.ID)
	if err != nil {
		return err
	}

	affected, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return fmt.Errorf("weird behavior. total affected: %d", affected)
	}
	return nil
}
```

補足:

- mysql adapter は service / handler パッケージに依存しない
- cursor は helper に寄せる
- `PrepareContext` の後処理や `rows.Err()` の扱いは、対象ファイルの既存スタイルに揃える
- レビュー時は「近傍コードとの一貫性」を先に確認する

---

## 4. Handler + Service IF（`internal/rest/foo.go`）

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

type FooService interface {
	Fetch(ctx context.Context, cursor string, num int64) ([]domain.Foo, string, error)
	GetByID(ctx context.Context, id int64) (domain.Foo, error)
	Store(ctx context.Context, f *domain.Foo) error
	Delete(ctx context.Context, id int64) error
}

type FooHandler struct {
	Service FooService
}

func NewFooHandler(e *echo.Echo, svc FooService) {
	h := &FooHandler{Service: svc}
	e.GET("/foos", h.Fetch)
	e.GET("/foos/:id", h.GetByID)
	e.POST("/foos", h.Store)
}

func isFooRequestValid(f *domain.Foo) (bool, error) {
	validate := validator.New()
	err := validate.Struct(f)
	if err != nil {
		return false, err
	}
	return true, nil
}

func (h *FooHandler) GetByID(c echo.Context) error {
	idP, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusNotFound, domain.ErrNotFound.Error())
	}

	item, err := h.Service.GetByID(c.Request().Context(), int64(idP))
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}

	return c.JSON(http.StatusOK, item)
}
```

補足:

- Service IF は handler 側で宣言
- リクエスト入力エラーは handler が直接返す
- service 起点のエラーは `ResponseError` で返す
- 新しい domain エラーを client-visible にするなら `getStatusCode` も更新する
- service mock は `internal/rest/mocks/` 配下に手動作成する

---

## 5. DI（`app/main.go`）

```go
repo := mysqlRepo.NewFooRepository(dbConn)
svc := foo.NewService(repo)
rest.NewFooHandler(e, svc)
```

`app/main.go` では配線だけを行い、ユースケース判断は service に残す。
