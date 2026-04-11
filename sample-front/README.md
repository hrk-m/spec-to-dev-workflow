# sample-front

フロントエンドのサンプル実装です。

## ローカル起動

1. 初回だけ env を作成

```bash
cp .env.local.example .env.local
```

2. 開発サーバーを起動

```bash
make run
```

- Front: `http://localhost:3000`
- API プロキシ先: `http://localhost:8080`

## Docker 起動

Front / API / DB をまとめて起動する場合は、リポジトリルートで次を使う。

```bash
make up
make down
```

Docker 側の Front は `http://localhost:3001` で公開される。
