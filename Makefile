.PHONY: help install clean check fix

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install  依存パッケージのインストール"
	@echo "  clean    node_modules を削除"
	@echo "  check    全 Markdown の lint チェック"
	@echo "  fix      自動修正可能なエラーを一括修正"
	@echo "  help     このヘルプを表示"

install:
	bun install

clean:
	rm -rf node_modules

check:
	bun run lint:md

fix:
	bun run lint:md:fix
