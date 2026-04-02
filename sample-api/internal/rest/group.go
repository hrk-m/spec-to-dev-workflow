// Package rest provides HTTP handlers for the API.
package rest

import (
	"context"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// GroupService defines the interface for the group use case.
type GroupService interface {
	ListGroups(ctx context.Context, search string, page, limit int) (domain.GroupListResponse, error)
}

// GroupHandler handles HTTP requests for the group endpoints.
type GroupHandler struct {
	Service GroupService
}

// NewGroupHandler registers the group routes on the given Echo instance.
func NewGroupHandler(e *echo.Echo, svc GroupService) {
	h := &GroupHandler{Service: svc}
	e.GET("/api/v1/groups", h.ListGroups)
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

	result, err := h.Service.ListGroups(ctx, search, page, limit)
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}

	return c.JSON(http.StatusOK, result)
}
