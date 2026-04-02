// Package main is the entry point for the sample-api server.
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"

	_ "github.com/go-sql-driver/mysql"

	groupSvc "github.com/hrk-m/spec-to-dev-workflow/sample-api/group"
	helloSvc "github.com/hrk-m/spec-to-dev-workflow/sample-api/hello"
	mysqlRepo "github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/repository/mysql"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/rest"
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	return fallback
}

func main() {
	host := getEnv("MYSQL_HOST", "localhost")
	port := getEnv("MYSQL_PORT", "3306")
	user := getEnv("MYSQL_USER", "root")
	pass := getEnv("MYSQL_PASSWORD", "password")
	dbname := getEnv("MYSQL_DATABASE", "sample")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, pass, host, port, dbname)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer func() { _ = db.Close() }()

	if err := db.Ping(); err != nil {
		log.Fatal("failed to connect to MySQL: ", err)
	}

	e := echo.New()
	e.Use(middleware.CORS())

	svc := helloSvc.NewService()
	rest.NewHelloHandler(e, svc)

	groupRepo := mysqlRepo.NewGroupRepository(db)
	gSvc := groupSvc.NewService(groupRepo)
	rest.NewGroupHandler(e, gSvc)

	e.Logger.Fatal(e.Start(":8080"))
}
