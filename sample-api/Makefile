.PHONY: help build run test test-verbose lint fix db-up db-down db-create db-migrate db-seed db-reset db-state clean

MIGRATE_CMD  = go run -tags 'mysql' -mod=mod github.com/golang-migrate/migrate/v4/cmd/migrate@latest
DB_URL       = mysql://root:password@tcp(localhost:3306)/sample
DOCKER_MYSQL = docker exec spec-to-dev-workflow-mysql-1 mysql -u root -ppassword
MYSQL        = mysql -h 127.0.0.1 -P 3306 -u root -ppassword sample

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  build        バイナリをビルド"
	@echo "  run          サーバーを起動 (port 8080)"
	@echo "  test         テストを実行"
	@echo "  test-verbose テストを詳細出力で実行"
	@echo "  lint         lint を実行"
	@echo "  fix          lint を実行し自動修正"
	@echo "  docker-up    MySQL コンテナを起動"
	@echo "  docker-down  MySQL コンテナを停止"
	@echo "  db-create    DB を作成"
	@echo "  db-migrate   マイグレーションを実行"
	@echo "  db-seed      シードデータを投入"
	@echo "  db-reset     DB をリセットして再構築"
	@echo "  db-state     マイグレーションの適用状況を表示"
	@echo "  clean        ビルド成果物を削除"
	@echo "  help         このヘルプを表示"

build:
	go build -o bin/api ./app/main.go

clean:
	rm -rf bin/

run:
	APP_ENV=development go run ./app/main.go

test:
	go test ./...

test-verbose:
	go test -v ./...

lint:
	golangci-lint run ./...

fix:
	golangci-lint run --fix ./...

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

db-create:
	$(DOCKER_MYSQL) \
		-e "CREATE DATABASE IF NOT EXISTS sample;"

db-migrate:
	$(MIGRATE_CMD) -path db/migrate -database "$(DB_URL)" up

db-seed:
	for f in db/seed/*.sql; do \
		$(MYSQL) < $$f; \
	done

db-reset:
	@if [ "$(APP_ENV)" != "development" ]; then \
		echo "Error: db-reset is only allowed in development environment (APP_ENV=development)."; \
		exit 1; \
	fi
	$(DOCKER_MYSQL) \
		-e "DROP DATABASE IF EXISTS sample; CREATE DATABASE sample;"
	$(MAKE) db-migrate

db-state:
	@echo "Status | Version            | Migration"
	@echo "-------|--------------------|--------------------------"
	@applied=$$($(MYSQL) \
		-s --skip-column-names -e "SELECT version FROM schema_migrations;" 2>/dev/null); \
	for f in db/migrate/*.up.sql; do \
		version=$$(basename $$f | cut -d_ -f1); \
		name=$$(basename $$f .up.sql | cut -d_ -f2-); \
		if echo "$$applied" | grep -qx "$$version"; then \
			printf "up     | %s | %s\n" "$$version" "$$name"; \
		else \
			printf "down   | %s | %s\n" "$$version" "$$name"; \
		fi; \
	done
