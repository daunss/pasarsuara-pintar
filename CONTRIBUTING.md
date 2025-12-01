# Contributing to PasarSuara Pintar

Terima kasih sudah tertarik untuk berkontribusi! 🙏

## Development Setup

1. Fork repository ini
2. Clone fork kamu
3. Setup environment variables (copy `.env.example` ke `.env`)
4. Install dependencies

## Code Style

### Go
- Gunakan `go fmt` sebelum commit
- Ikuti [Effective Go](https://golang.org/doc/effective_go)
- Tambahkan tests untuk fitur baru

### TypeScript/React
- Gunakan ESLint (`npm run lint`)
- Ikuti React best practices
- Gunakan TypeScript strict mode

## Commit Messages

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug
docs: update documentation
test: add tests
chore: maintenance
```

Contoh:
- `feat(agents): add market intel agent`
- `fix(wa-gateway): handle connection timeout`
- `docs: update API documentation`

## Pull Request

1. Buat branch dari `develop`
2. Implement fitur/fix
3. Tambahkan tests
4. Update dokumentasi jika perlu
5. Submit PR ke `develop`

## Questions?

Buka issue atau diskusi di GitHub.
