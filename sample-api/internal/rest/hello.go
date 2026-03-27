package rest

import (
	"context"
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

type HelloService interface {
	GetHello(ctx context.Context) (domain.Hello, error)
}

type HelloHandler struct {
	Service HelloService
}

func NewHelloHandler(e *echo.Echo, svc HelloService) {
	h := &HelloHandler{Service: svc}
	e.GET("/hello", h.GetHello)
}

func (h *HelloHandler) GetHello(c echo.Context) error {
	ctx := c.Request().Context()
	result, err := h.Service.GetHello(ctx)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return c.JSON(http.StatusOK, result)
}
