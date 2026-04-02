.PHONY: help build run test test-verbose lint fix db-up db-down clean

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

clean:
	rm -rf bin/
