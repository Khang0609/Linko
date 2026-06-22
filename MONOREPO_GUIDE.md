# Linko Monorepo Developer Guide

Welcome to the Linko Monorepo. This workspace utilizes **PNPM Workspaces** for multi-package management and **Nx** for task coordination, caching, and dependency graph analysis. This setup ensures that builds remain lightning-fast and dependencies stay modular.

---

## 📂 Directory Layout

```text
├── .github/                 # CI/CD Workflows
├── .husky/                  # Git hooks (pre-commit, commit-msg)
├── apps/                    # Executable applications (e.g. @linko/web-app)
├── packages/                # Shared utilities and libraries (e.g. @linko/core-utils)
├── eslint.config.js         # Root ESLint Flat Configuration (Universal JS/TS)
├── nx.json                  # Nx Task Runner & Caching definitions
├── pnpm-workspace.yaml      # Monorepo workspace mapping
└── package.json             # Root dependencies & scripts
```

---

## 🏷️ Package Scoping and Naming

To maintain import clarity and prevent path-mapping pollution, all packages and applications within this monorepo must be scoped to `@linko/`.

- **Apps**: Named `@linko/<app-name>` (e.g. `@linko/web-app`).
- **Packages**: Named `@linko/<package-name>` (e.g. `@linko/core-utils`).

### Inter-package Dependencies

To reference a package in another app or package within the monorepo, define it in the local package's `package.json` using the `workspace:*` specifier:

```json
"dependencies": {
  "@linko/core-utils": "workspace:*"
}
```

_Note: Run `pnpm install` after modifying dependencies to update symlinks._

---

## 🎨 Flexibly Swapping or Customizing the Tech Stack

Your team is **not** locked into the initial boilerplate stack (like Next.js or Express). You are free to change it, add new components, or start fresh.

### How to ignore or change boilerplate:

1.  **To Replace an App/Package**: You can delete the folder (e.g. `apps/web-app` or `packages/core-utils`) and install your desired framework (e.g., NestJS, Fastify, SvelteKit, Go, Python) inside the respective folder.
2.  **Ensure Naming Conventions**: Keep the `@linko/` name prefix in the new project's `package.json` so that workspace linkages and imports continue to function smoothly.
3.  **Wired Scripts**: Ensure the new project has standard target scripts in its `package.json` (such as `"build"`, `"lint"`, `"test"`, `"dev"`) so that Nx can run them in a unified manner.

---

## 🚀 Speeding Up Development: Nx Cache & Task Executions

Nx optimizes task execution by looking at the project dependency graph and caching previous results.

- **Cache Hits**: If a package or its dependencies haven't changed, running `pnpm build`, `pnpm test`, or `pnpm lint` will instantly retrieve the outputs from the local cache (`.nx/cache`).
- **Target Configuration (`nx.json`)**:
  - Build, lint, and test targets are cacheable.
  - The `dev` target runs interactive dev-servers and is configured **never** to cache, preventing frozen hot-reloads.
  - Build inputs are optimized: changing a test file (e.g. `foo.test.js`) will **not** invalidate build caches because test/spec files are excluded from the `production` inputs pipeline.

---

## 🛑 Git Rules & Automation

### 1. Mandatory Conventional Commits

All commits must follow the Conventional Commits specification. This ensures a clean, automated changelog and release process.

**Structure**:

```text
<type>(<scope>): <short summary>

[optional body]
```

**Common Types**:

- `feat`: A new feature (e.g., `feat(auth): add google sign-in`)
- `fix`: A bug fix (e.g., `fix(api): resolve db connection leak`)
- `docs`: Documentation changes (e.g., `docs(readme): update setup guidelines`)
- `style`: Code formatting, missing semicolons, etc. (no production code change)
- `refactor`: Restructuring code without changing functionality
- `test`: Adding or correcting tests
- `chore`: Tooling, configs, or package updates (e.g., `chore: bump dependencies`)

_If a commit fails to follow this syntax, the `commit-msg` hook will block the commit._

### 2. Pre-commit Linting and Formatting

When running `git commit`, `lint-staged` triggers automatically on changed files:

- JS/TS files are automatically linted (`eslint --fix`) and formatted (`prettier --write`).
- JSON/Markdown/YAML files are formatted (`prettier --write`).
- Any unresolvable lint errors will abort the commit.

---

## 🤖 CI/CD Operations (GitHub Actions)

In pull requests and main branch builds, CI executes only on **affected** code. If you make a change in `@linko/core-utils`, CI will build and test `@linko/core-utils` and `@linko/web-app` (since the web app depends on core-utils). However, if you make a change in `@linko/web-app` alone, the `@linko/core-utils` build/test runs will be completely skipped, saving CI build minutes.

Commands run in CI:

- `pnpm exec nx affected -t lint`
- `pnpm exec nx affected -t test`
- `pnpm exec nx affected -t build`
