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
	npm install

clean:
	rm -rf node_modules

check:
	npm run lint:md

fix:
	npm run lint:md:fix
