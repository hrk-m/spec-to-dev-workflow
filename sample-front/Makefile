.PHONY: help install run build start kill test clean

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install  依存パッケージをインストール"
	@echo "  run      開発サーバーを起動 (hot reload)"
	@echo "  build    本番用バンドルをビルド"
	@echo "  start    本番モードで起動"
	@echo "  test     テストを実行"
	@echo "  clean    ビルド成果物を削除"
	@echo "  kill     ポート 3000 のプロセスを停止"
	@echo "  help     このヘルプを表示"

install:
	bun install

run:
	bun --hot src/index.ts

build:
	bun build ./src/index.html --outdir=dist --sourcemap --target=browser --minify --define:process.env.NODE_ENV='"production"' --env='BUN_PUBLIC_*'

start:
	NODE_ENV=production bun src/index.ts

test:
	bun test

clean:
	rm -rf dist/

kill:
	-lsof -ti:3000 | xargs kill -9
