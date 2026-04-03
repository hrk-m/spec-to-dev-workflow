# ビルド・テストコマンド

## sample-api（Go）

```bash
make test         # テスト
make test-verbose # テスト（詳細）
make lint         # lint
make fix          # lint + 自動修正
make build        # ビルド
make run          # ローカル起動
```

## sample-front（TypeScript / Bun）

```bash
make test         # テスト実行
make lint         # oxlint でリント
make fix          # oxlint 自動修正
make build        # 本番ビルド
make run          # 開発サーバー起動
make check        # typecheck + lint + format + test をまとめて実行
```
