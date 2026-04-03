// Package rest provides HTTP handlers for the API.
package rest

import (
	"context"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

const (
	defaultMemberLimit = 500
	minMemberLimit     = 1
	maxMemberLimit     = 500
)

// GroupService defines the interface for the group use case.
type GroupService interface {
	ListGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, int, error)
	GetByID(ctx context.Context, id uint64) (domain.Group, error)
	ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error)
}

// GroupHandler handles HTTP requests for the group endpoints.
type GroupHandler struct {
	Service GroupService
}

// NewGroupHandler registers the group routes on the given Echo instance.
func NewGroupHandler(e *echo.Echo, svc GroupService) {
	h := &GroupHandler{Service: svc}
	e.GET("/api/v1/groups", h.ListGroups)
	e.GET("/api/v1/groups/:id", h.GetByID)
	e.GET("/api/v1/groups/:id/members", h.ListGroupMembers)
}

type groupListResponse struct {
	Groups     []domain.Group `json:"groups"`
	Pagination paginationMeta `json:"pagination"`
}

type paginationMeta struct {
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

type groupMemberListResponse struct {
	Members []domain.GroupMember `json:"members"`
	Total   int                  `json:"total"`
}

// GetByID handles GET /api/v1/groups/:id.
func (h *GroupHandler) GetByID(c echo.Context) error {
	ctx := c.Request().Context()

	idP, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	if idP < 1 {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	result, err := h.Service.GetByID(ctx, uint64(idP))
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}

	return c.JSON(http.StatusOK, result)
}

// ListGroupMembers handles GET /api/v1/groups/:id/members.
func (h *GroupHandler) ListGroupMembers(c echo.Context) error {
	ctx := c.Request().Context()

	idP, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	if idP < 1 {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	limit, limitErr := parseMemberLimit(c.QueryParam("limit"))
	if limitErr != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	offset, offsetErr := parseMemberOffset(c.QueryParam("offset"))
	if offsetErr != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	q := c.QueryParam("q")

	members, total, err := h.Service.ListGroupMembers(ctx, uint64(idP), limit, offset, q)
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}

	return c.JSON(http.StatusOK, groupMemberListResponse{Members: members, Total: total})
}

// ListGroups handles GET /api/v1/groups.
func (h *GroupHandler) ListGroups(c echo.Context) error {
	ctx := c.Request().Context()

	pageStr := c.QueryParam("page")
	limitStr := c.QueryParam("limit")

	if pageStr == "" || limitStr == "" {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, ResponseError{Message: domain.ErrBadParamInput.Error()})
	}

	search := c.QueryParam("search")

	groups, total, err := h.Service.ListGroups(ctx, search, page, limit)
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}

	return c.JSON(http.StatusOK, groupListResponse{
		Groups: groups,
		Pagination: paginationMeta{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	})
}

// parseMemberLimit parses and validates the limit query parameter for member listing.
func parseMemberLimit(s string) (uint64, error) {
	if s == "" {
		return defaultMemberLimit, nil
	}

	l, err := strconv.Atoi(s)
	if err != nil || l < minMemberLimit || l > maxMemberLimit {
		return 0, domain.ErrBadParamInput
	}

	return uint64(l), nil
}

// parseMemberOffset parses and validates the offset query parameter for member listing.
func parseMemberOffset(s string) (uint64, error) {
	if s == "" {
		return 0, nil
	}

	o, err := strconv.Atoi(s)
	if err != nil || o < 0 {
		return 0, domain.ErrBadParamInput
	}

	return uint64(o), nil
}
