package rest_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
)

type mockGroupService struct {
	mock.Mock
}

func (m *mockGroupService) ListGroups(ctx context.Context, search string, page, limit int) (domain.GroupListResponse, error) {
	args := m.Called(ctx, search, page, limit)
	return args.Get(0).(domain.GroupListResponse), args.Error(1)
}

func TestGroupHandler_ListGroups_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?search=dev&page=1&limit=20", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockGroupService)
	resp := domain.GroupListResponse{
		Groups: []domain.Group{
			{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 1},
		},
		Pagination: domain.Pagination{Total: 1, Page: 1, Limit: 20},
	}
	svc.On("ListGroups", mock.Anything, "dev", 1, 20).Return(resp, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result domain.GroupListResponse
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Len(t, result.Groups, 1)
	assert.Equal(t, "dev-team", result.Groups[0].Name)
	assert.Equal(t, 1, result.Pagination.Total)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_DefaultSearch(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=1&limit=10", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockGroupService)
	resp := domain.GroupListResponse{
		Groups:     []domain.Group{},
		Pagination: domain.Pagination{Total: 0, Page: 1, Limit: 10},
	}
	svc.On("ListGroups", mock.Anything, "", 1, 10).Return(resp, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_InvalidPage(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=abc&limit=10", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_InvalidLimit(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=1&limit=abc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_MissingPage(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=10", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_MissingLimit(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_ServiceBadParam(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=0&limit=10", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockGroupService)
	svc.On("ListGroups", mock.Anything, "", 0, 10).
		Return(domain.GroupListResponse{}, domain.ErrBadParamInput)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_ServiceInternalError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?page=1&limit=20", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mockGroupService)
	svc.On("ListGroups", mock.Anything, "", 1, 20).
		Return(domain.GroupListResponse{}, domain.ErrInternalServerError)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "internal server error", result["message"])
	svc.AssertExpectations(t)
}
