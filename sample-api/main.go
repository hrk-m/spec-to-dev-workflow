package main

import (
	"github.com/labstack/echo/v4"

	helloSvc "github.com/hrk-m/spec-to-dev-workflow/sample-api/hello"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
)

func main() {
	e := echo.New()

	svc := helloSvc.NewService()
	rest.NewHelloHandler(e, svc)

	e.Logger.Fatal(e.Start(":8080"))
}
