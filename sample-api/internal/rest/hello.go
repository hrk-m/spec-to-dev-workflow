// Package rest provides HTTP handlers for the API.
package rest

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// HelloService defines the interface for the hello use case.
type HelloService interface {
	GetHello(ctx context.Context) (domain.Hello, error)
}

// HelloHandler handles HTTP requests for the hello endpoint.
type HelloHandler struct {
	Service HelloService
}

// NewHelloHandler registers the hello routes on the given Echo instance.
func NewHelloHandler(e *echo.Echo, svc HelloService) {
	h := &HelloHandler{Service: svc}
	e.GET("/hello", h.GetHello)
}

// GetHello handles GET /hello.
func (h *HelloHandler) GetHello(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.Service.GetHello(ctx)
	if err != nil {
		return c.JSON(getStatusCode(err), ResponseError{Message: err.Error()})
	}
	return c.JSON(http.StatusOK, result)
}
