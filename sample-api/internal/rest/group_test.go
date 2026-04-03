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

func TestGroupHandler_GetByID_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	resp := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 5}
	svc.On("GetByID", mock.Anything, uint64(1)).Return(resp, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result domain.Group
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, uint64(1), result.ID)
	assert.Equal(t, "dev-team", result.Name)
	assert.Equal(t, 5, result.MemberCount)
	svc.AssertExpectations(t)
}

func TestGroupHandler_GetByID_InvalidID(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/abc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("abc")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_GetByID_ZeroID(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("0")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_GetByID_NegativeID(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("-1")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_GetByID_NotFound(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/9999", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("9999")

	svc := new(mocks.MockGroupService)
	svc.On("GetByID", mock.Anything, uint64(9999)).
		Return(domain.Group{}, domain.ErrNotFound)

	h := &rest.GroupHandler{Service: svc}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "your requested item is not found", result["message"])
	svc.AssertExpectations(t)
}

func TestGroupHandler_GetByID_InternalError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	svc.On("GetByID", mock.Anything, uint64(1)).
		Return(domain.Group{}, domain.ErrInternalServerError)

	h := &rest.GroupHandler{Service: svc}
	err := h.GetByID(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "internal server error", result["message"])
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroupMembers_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members?limit=500&offset=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	members := []domain.GroupMember{
		{ID: 1, FirstName: "Taro", LastName: "Yamada"},
	}
	svc.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return(members, 1, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result struct {
		Members []domain.GroupMember `json:"members"`
		Total   int                  `json:"total"`
	}
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Len(t, result.Members, 1)
	assert.Equal(t, 1, result.Total)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroupMembers_DefaultParams(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	svc.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return([]domain.GroupMember{}, 0, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroupMembers_WithSearch(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members?q=Yamada", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	members := []domain.GroupMember{
		{ID: 1, FirstName: "Taro", LastName: "Yamada"},
	}
	svc.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "Yamada").
		Return(members, 2, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroupMembers_InvalidID(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/abc/members", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("abc")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroupMembers_InvalidLimit(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members?limit=501", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroupMembers_InvalidLimitZero(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members?limit=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroupMembers_InvalidOffset(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members?offset=-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroupMembers_GroupNotFound(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/9999/members", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("9999")

	svc := new(mocks.MockGroupService)
	svc.On("ListGroupMembers", mock.Anything, uint64(9999), uint64(500), uint64(0), "").
		Return([]domain.GroupMember(nil), 0, domain.ErrNotFound)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "your requested item is not found", result["message"])
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroupMembers_InternalError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups/1/members", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)
	c.SetPath("/api/v1/groups/:id/members")
	c.SetParamNames("id")
	c.SetParamValues("1")

	svc := new(mocks.MockGroupService)
	svc.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return([]domain.GroupMember(nil), 0, domain.ErrInternalServerError)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroupMembers(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "internal server error", result["message"])
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_OK(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?q=dev&limit=20&offset=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	groups := []domain.Group{
		{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 1},
	}
	svc.On("ListGroups", mock.Anything, "dev", 20, 0).Return(groups, 42, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result struct {
		Groups []domain.Group `json:"groups"`
		Total  int            `json:"total"`
	}
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Len(t, result.Groups, 1)
	assert.Equal(t, "dev-team", result.Groups[0].Name)
	assert.Equal(t, 42, result.Total)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_DefaultParams(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 0).Return([]domain.Group{}, 0, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_WithOffset(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=500&offset=500", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 500).Return([]domain.Group{}, 42, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result struct {
		Groups []domain.Group `json:"groups"`
		Total  int            `json:"total"`
	}
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, 42, result.Total)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_InvalidLimit(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=abc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_LimitTooHigh(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=501", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_LimitZero(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_LimitMax(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?limit=500", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 0).Return([]domain.Group{}, 0, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_InvalidOffset(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?offset=abc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_NegativeOffset(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?offset=-1", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	h := &rest.GroupHandler{Service: new(mocks.MockGroupService)}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "given param is not valid", result["message"])
}

func TestGroupHandler_ListGroups_OffsetZero(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups?offset=0", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 0).Return([]domain.Group{}, 0, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_EmptyResult(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 0).Return([]domain.Group{}, 0, nil)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusOK, rec.Code)

	var result struct {
		Groups []domain.Group `json:"groups"`
		Total  int            `json:"total"`
	}
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Empty(t, result.Groups)
	assert.Equal(t, 0, result.Total)
	svc.AssertExpectations(t)
}

func TestGroupHandler_ListGroups_ServiceInternalError(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/groups", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	svc := new(mocks.MockGroupService)
	svc.On("ListGroups", mock.Anything, "", 500, 0).
		Return([]domain.Group(nil), 0, domain.ErrInternalServerError)

	h := &rest.GroupHandler{Service: svc}
	err := h.ListGroups(c)

	assert.NoError(t, err)
	assert.Equal(t, http.StatusInternalServerError, rec.Code)

	var result map[string]string
	assert.NoError(t, json.NewDecoder(rec.Body).Decode(&result))
	assert.Equal(t, "internal server error", result["message"])
	svc.AssertExpectations(t)
}
