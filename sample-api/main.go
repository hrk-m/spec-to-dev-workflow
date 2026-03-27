// Package main is the entry point for the sample-api server.
package main

import (
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	helloSvc "github.com/hrk-m/spec-to-dev-workflow/sample-api/hello"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
)

func main() {
	e := echo.New()

	e.Use(middleware.CORS())

	svc := helloSvc.NewService()
	rest.NewHelloHandler(e, svc)

	e.Logger.Fatal(e.Start(":8080"))
}
