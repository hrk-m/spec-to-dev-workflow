package rest_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
)

type mockHelloService struct {
	mock.Mock
}

func (m *mockHelloService) GetHello(ctx context.Context) (domain.Hello, error) {
	args := m.Called(ctx)
	return args.Get(0).(domain.Hello), args.Error(1)
}

func TestHelloHandler_GetHello_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/hello", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockHelloService)
	svc.On("GetHello", mock.Anything).Return(domain.Hello{Message: "hello"}, nil)

	h := &rest.HelloHandler{Service: svc}
	err := h.GetHello(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result domain.Hello
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "hello", result.Message)
	svc.AssertExpectations(t)
}

func TestHelloHandler_GetHello_ServiceError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/hello", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockHelloService)
	svc.On("GetHello", mock.Anything).Return(domain.Hello{}, errors.New("internal error"))

	h := &rest.HelloHandler{Service: svc}
	err := h.GetHello(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "internal error", result["message"])
	svc.AssertExpectations(t)
}
