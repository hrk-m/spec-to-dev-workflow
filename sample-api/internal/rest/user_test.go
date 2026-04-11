package rest_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest/mocks"
)

func TestUserHandler_ListUsers_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?limit=500&offset=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	svc := new(mocks.MockUserService)
	users := []domain.User{
		{ID: 1, FirstName: "Taro", LastName: "Yamada"},
	}
	svc.On("ListUsers", mock.Anything, "", 500, 0).Return(users, 15, nil)

	h := &rest.UserHandler{Service: svc}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result struct {
		Users []domain.User `json:"users"`
		Total int           `json:"total"`
	}
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Len(t, result.Users, 1)
	assert.Equal(t, 15, result.Total)
	svc.AssertExpectations(t)
}

func TestUserHandler_ListUsers_DefaultParams(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	svc := new(mocks.MockUserService)
	svc.On("ListUsers", mock.Anything, "", 500, 0).Return([]domain.User{}, 0, nil)

	h := &rest.UserHandler{Service: svc}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestUserHandler_ListUsers_WithQuery(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?q=Suzuki", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	svc := new(mocks.MockUserService)
	svc.On("ListUsers", mock.Anything, "Suzuki", 500, 0).Return([]domain.User{}, 0, nil)

	h := &rest.UserHandler{Service: svc}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestUserHandler_ListUsers_InvalidLimit(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?limit=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	h := &rest.UserHandler{Service: new(mocks.MockUserService)}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestUserHandler_ListUsers_InvalidOffset(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users?offset=-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	h := &rest.UserHandler{Service: new(mocks.MockUserService)}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)
}

func TestUserHandler_ListUsers_InternalError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/users")

	svc := new(mocks.MockUserService)
	svc.On("ListUsers", mock.Anything, "", 500, 0).
		Return([]domain.User(nil), 0, domain.ErrInternalServerError)

	h := &rest.UserHandler{Service: svc}
	err := h.ListUsers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)
	svc.AssertExpectations(t)
}
