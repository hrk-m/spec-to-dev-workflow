.PHONY: help build run test clean

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  build    バイナリをビルド"
	@echo "  run      サーバーを起動 (port 8080)"
	@echo "  test     テストを実行"
	@echo "  clean    ビルド成果物を削除"
	@echo "  help     このヘルプを表示"

build:
	go build -o bin/api ./...

run:
	go run main.go

test:
	go test ./...

clean:
	rm -rf bin/
