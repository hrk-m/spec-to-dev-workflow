.PHONY: help install clean check fix up down e2e e2e-ui

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Targets:"
	@echo "  install  依存パッケージのインストール"
	@echo "  clean    node_modules を削除"
	@echo "  check    全 Markdown の lint チェック"
	@echo "  fix      自動修正可能なエラーを一括修正"
	@echo "  up       Docker 開発スタックを起動"
	@echo "  down     Docker 開発スタックを停止"
	@echo "  e2e      E2Eテストを実行（Docker サーバ + ローカル Playwright）"
	@echo "  e2e-ui   E2EテストをUIモードで実行（テストの on/off 切り替え可）"
	@echo "  help     このヘルプを表示"

install:
	bun install

clean:
	rm -rf node_modules

check:
	bun run format:md:check

fix:
	bun run format:md

up:
	docker compose up --build -d --wait

down:
	docker compose down --remove-orphans

e2e:
	docker compose -f docker-compose.e2e.yml up --build -d --wait mysql api front
	cd e2e && bunx playwright install --with-deps chromium
	cd e2e && BASE_URL=http://localhost:13000 bunx playwright test; \
	docker compose -f $(CURDIR)/docker-compose.e2e.yml down -v --remove-orphans

e2e-ui:
	docker compose -f docker-compose.e2e.yml up --build -d --wait mysql api front
	cd e2e && BASE_URL=http://localhost:13000 bunx playwright test --ui; \
	docker compose -f $(CURDIR)/docker-compose.e2e.yml down -v --remove-orphans
