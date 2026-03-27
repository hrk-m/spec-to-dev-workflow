# テストパターン

テストは全レイヤーで**外部パッケージ**（`package {domain}_test`）を使う。

## Mock 生成

```go
//go:generate mockery --name FooRepository  // foo/service.go に記述
//go:generate mockery --name FooService     // internal/rest/foo.go に記述
```

```bash
go generate ./foo/...
go generate ./internal/rest/...
```

生成物（`mocks/` 配下）は手動編集禁止。

---

## Service テスト（`foo/service_test.go`）

`package foo_test` — mockery 生成の mock で Repository を差し替えてビジネスロジックを検証する。

```go
package foo_test

import (
    "context"
    "testing"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/bxcodec/go-clean-arch/foo"
    "github.com/bxcodec/go-clean-arch/foo/mocks"
    "github.com/bxcodec/go-clean-arch/domain"
)

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

    t.Run("error-failed", func(t *testing.T) {
        mockRepo.On("GetByID", mock.Anything, mock.AnythingOfType("int64")).
            Return(domain.Foo{}, domain.ErrNotFound).Once()

        svc := foo.NewService(mockRepo)
        result, err := svc.GetByID(context.TODO(), 1)

        assert.Error(t, err)
        assert.Equal(t, domain.Foo{}, result)
        mockRepo.AssertExpectations(t)
    })
}
```

---

## Repository テスト（`internal/repository/mysql/foo_test.go`）

`package mysql_test` — sqlmock で DB クエリを検証する。クエリ文字列の `?` は `\\?` でエスケープ。DB 接続エラーは `t.Fatalf` で即終了。

```go
package mysql_test

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    sqlmock "gopkg.in/DATA-DOG/go-sqlmock.v1"

    "github.com/bxcodec/go-clean-arch/domain"
    mysqlRepo "github.com/bxcodec/go-clean-arch/internal/repository/mysql"
)

func TestGetFooByID(t *testing.T) {
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
    }

    rows := sqlmock.NewRows([]string{"id", "name", "updated_at", "created_at"}).
        AddRow(1, "test", time.Now(), time.Now())

    query := "SELECT id, name, updated_at, created_at FROM foo WHERE id = \\?"
    mock.ExpectQuery(query).WillReturnRows(rows)

    repo := mysqlRepo.NewFooRepository(db)
    result, err := repo.GetByID(context.TODO(), 1)

    assert.NoError(t, err)
    assert.Equal(t, int64(1), result.ID)
}

func TestStoreFoo(t *testing.T) {
    now := time.Now()
    f := &domain.Foo{
        Name:      "test",
        CreatedAt: now,
        UpdatedAt: now,
    }
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
    }

    query := "INSERT foo SET name=\\?, updated_at=\\?, created_at=\\?"
    prep := mock.ExpectPrepare(query)
    prep.ExpectExec().WithArgs(f.Name, f.UpdatedAt, f.CreatedAt).WillReturnResult(sqlmock.NewResult(1, 1))

    repo := mysqlRepo.NewFooRepository(db)
    err = repo.Store(context.TODO(), f)

    assert.NoError(t, err)
    assert.Equal(t, int64(1), f.ID)
}

func TestDeleteFoo(t *testing.T) {
    db, mock, err := sqlmock.New()
    if err != nil {
        t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
    }

    query := "DELETE FROM foo WHERE id = \\?"
    prep := mock.ExpectPrepare(query)
    prep.ExpectExec().WithArgs(int64(1)).WillReturnResult(sqlmock.NewResult(1, 1))

    repo := mysqlRepo.NewFooRepository(db)
    err = repo.Delete(context.TODO(), 1)

    assert.NoError(t, err)
}
```

---

## Handler テスト（`internal/rest/foo_test.go`）

`package rest_test` — `httptest` + mockery 生成の mock で HTTP レスポンスを検証する。

```go
package rest_test

import (
    "context"
    "net/http"
    "net/http/httptest"
    "strconv"
    "strings"
    "testing"

    faker "github.com/go-faker/faker/v4"
    "github.com/labstack/echo/v4"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"

    "github.com/bxcodec/go-clean-arch/domain"
    "github.com/bxcodec/go-clean-arch/internal/rest"
    "github.com/bxcodec/go-clean-arch/internal/rest/mocks"
)

func TestFooGetByID(t *testing.T) {
    var mockFoo domain.Foo
    err := faker.FakeData(&mockFoo)
    assert.NoError(t, err)

    mockSvc := new(mocks.FooService)
    mockSvc.On("GetByID", mock.Anything, int64(mockFoo.ID)).Return(mockFoo, nil)

    e := echo.New()
    req, err := http.NewRequestWithContext(context.TODO(), echo.GET,
        "/foos/"+strconv.Itoa(int(mockFoo.ID)), strings.NewReader(""))
    assert.NoError(t, err)

    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)
    c.SetPath("/foos/:id")
    c.SetParamNames("id")
    c.SetParamValues(strconv.Itoa(int(mockFoo.ID)))

    h := rest.FooHandler{Service: mockSvc}
    err = h.GetByID(c)

    require.NoError(t, err)
    assert.Equal(t, http.StatusOK, rec.Code)
    mockSvc.AssertExpectations(t)
}
```
