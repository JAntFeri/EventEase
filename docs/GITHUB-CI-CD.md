# GitHub CI/CD — EventEase

Kratka navodila za vzpostavitev GitHub Actions cevovoda, ki ustreza strukturi tega projekta.

## Kaj cevovod preverja

| Job | Kaj naredi |
|-----|------------|
| **Frontend** | `npm ci` → `lint` → `test` → `build` |
| **Backend** | `zig build` → `zig build test` |
| **Docker + smoke** | `docker compose up` → API smoke test (create → vote → finalize) |

## 1. Predpogoji

- Repozitorij na GitHubu (npr. `JAntFeri/EventEase`)
- V korenu projekta:
  - `frontend/EventEase/` — React
  - `backend/logic/` — Zig
  - `compose.yaml`, `Dockerfile`
  - `scripts/ci-smoke-test.sh`

## 2. Lokalno preverjanje (pred pushom)

```bash
# Frontend
cd frontend/EventEase
npm ci && npm run lint && npm test && npm run build

# Backend
cd backend/logic
zig build && zig build test

# Celoten stack + smoke test
cd ../..   # koren repozitorija
docker compose up --build -d
bash scripts/ci-smoke-test.sh http://localhost:8080
docker compose down -v
```

## 3. Ustvari mapo za GitHub Actions

V korenu repozitorija:

```
.github/
└── workflows/
    └── ci.yml
```

V repozitoriju je že pripravljena datoteka [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). Če je še nimaš, jo ustvari ročno ali kopiraj iz repozitorija.

## 4. Vsebina workflow datoteke (korak za korakom)

### 4.1 Sprožilci (`on`)

```yaml
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
```

Cevovod teče ob pushu in PR-jih na `main` / `master`. Po potrebi dodaj svojo vejo (npr. `develop`).

### 4.2 Job: Frontend

```yaml
jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend/EventEase
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: npm
          cache-dependency-path: frontend/EventEase/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

**Testi:** `src/utils/eventHelpers.test.js` (Node built-in test runner).

### 4.3 Job: Backend

```yaml
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend/logic
    steps:
      - uses: actions/checkout@v4
      - uses: goto-bus-stop/setup-zig@v2
        with:
          version: 0.16.0
      - run: zig build
      - run: zig build test
```

**Testi:** `src/uuid.zig` — UUID pretvorbe, validacija, format v4.

### 4.4 Job: Docker + smoke test

```yaml
  docker-smoke:
    needs: [frontend, backend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
      - run: docker compose up -d
      - name: Wait for app
        run: |
          for i in $(seq 1 30); do
            curl -sf http://localhost:8080/ && break
            sleep 2
          done
      - run: sudo apt-get update && sudo apt-get install -y jq
      - run: bash scripts/ci-smoke-test.sh http://localhost:8080
      - if: always()
        run: docker compose down -v
```

Smoke test pokriva celoten API tok: ustvari anketo → prebere → glasuje → zaključi.

## 5. Push in preverjanje

```bash
git add .github/workflows/ci.yml scripts/ docs/ backend/logic/src/uuid.zig frontend/EventEase/src/utils/
git commit -m "Add CI pipeline and unit tests"
git push origin main
```

Na GitHubu: **Actions** → izberi workflow **CI** → preveri, da so vsi jobi zeleni.

## 6. Opcijsko: badge v README

Dodaj pod badge-e na vrh `README.md` (zamenjaj `JAntFeri/EventEase`):

```markdown
[![CI](https://github.com/JAntFeri/EventEase/actions/workflows/ci.yml/badge.svg)](https://github.com/JAntFeri/EventEase/actions/workflows/ci.yml)
```

## 7. Nadaljnji koraki (CD)

Ko CI stabilno deluje, lahko dodaš ločen workflow za produkcijo:

| Korak | Orodje | Namen |
|-------|--------|--------|
| Build slike | `docker/build-push-action` | Push v GitHub Container Registry |
| Deploy | SSH / Fly.io / Render | `docker compose pull && up -d` |
| Skrivnosti | GitHub Secrets | `DATABASE_URL`, registry token |

Primer sprožilca za release:

```yaml
on:
  push:
    tags: ["v*"]
```

## 8. Pogosti problemi

| Težava | Rešitev |
|--------|---------|
| `zig build test` — manjka `root.zig` | Testi so v `uuid.zig`; `build.zig` ne sme kazati na neobstoječo datoteko |
| Smoke test timeout | Povečaj `seq 1 30` ali preveri `docker compose logs app` |
| `npm test` ne najde testov | Zaženi iz `frontend/EventEase/`, ne iz korena |
| Zig verzija | Mora biti **0.16.0** (glej `build.zig.zon`) |

## 9. Povzetek testov v projektu

```
backend/logic/src/uuid.zig          → zig build test
frontend/EventEase/src/utils/       → npm test
scripts/ci-smoke-test.sh            → integracijski test (CI job docker-smoke)
```
