.PHONY: help build run test test-verbose lint fix db-up db-down db-migrate db-rollback db-seed db-reset clean

MIGRATE_CMD = go run -tags 'mysql' -mod=mod github.com/golang-migrate/migrate/v4/cmd/migrate@latest
DB_URL = mysql://root:password@tcp(localhost:3306)/sample

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
	@echo "  db-up        MySQL コンテナを起動"
	@echo "  db-down      MySQL コンテナを停止"
	@echo "  db-migrate   マイグレーションを実行"
	@echo "  db-rollback  マイグレーションを 1 つ戻す"
	@echo "  db-seed      シードデータを投入"
	@echo "  db-reset     DB をリセットして再構築"
	@echo "  clean        ビルド成果物を削除"
	@echo "  help         このヘルプを表示"

build:
	go build -o bin/api ./app/main.go

run:
	go run ./app/main.go

test:
	go test ./...

test-verbose:
	go test -v ./...

lint:
	golangci-lint run ./...

fix:
	golangci-lint run --fix ./...

db-up:
	docker-compose up -d

db-down:
	docker-compose down

db-migrate:
	$(MIGRATE_CMD) -path db/migrate -database "$(DB_URL)" up

db-rollback:
	$(MIGRATE_CMD) -path db/migrate -database "$(DB_URL)" down 1

db-seed:
	for f in db/seed/*.sql; do \
		mysql -h 127.0.0.1 -P 3306 -u root -ppassword sample < $$f; \
	done

db-reset: db-down db-up
	@echo "Waiting for MySQL to be ready..."
	@until docker-compose exec -T mysql mysqladmin ping -h localhost -u root -ppassword --silent 2>/dev/null; do \
		sleep 1; \
	done
	$(MAKE) db-migrate
	$(MAKE) db-seed

clean:
	rm -rf bin/
