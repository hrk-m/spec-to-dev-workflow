.PHONY: help check fix

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  check  全 Markdown の lint チェック"
	@echo "  fix    自動修正可能なエラーを一括修正"
	@echo "  help   このヘルプを表示"

check:
	npm run lint:md

fix:
	npm run lint:md:fix
