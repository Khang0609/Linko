# Linko - Business Management & Collaboration Platform

Linko is a modern business management application with a unique, demand-driven connection engine. Its standout feature is its ability to seamlessly connect two or more businesses together based on their mutual needs and requirements, fostering automated collaborations, supply chain alignment, and partner discovery.

This repository is structured as a high-performance **PNPM Workspace** and **Nx Monorepo** designed to scale with your team and support any technology stack (Next.js, Vite, NestJS, Express, etc.).

---

## Getting Started

### 📋 Prerequisites

To work on this repository, you must have the following installed:

- [Node.js](https://nodejs.org/) (v18.0.0 or higher, v20+ recommended)
- [pnpm](https://pnpm.io/) (v10.0.0 or higher)

> [!CAUTION]
> **Strict Package Manager Policy**: This monorepo strictly enforces `pnpm`. Attempting to install dependencies using `npm` or `yarn` will fail and block the installation.

### 🚀 Setup and Installation

1.  **Clone the repository**:

    ```bash
    git clone <your-repository-url>
    cd Linko
    ```

2.  **Install dependencies and initialize Git hooks**:
    ```bash
    pnpm install
    ```
    _This will install all dependencies, configure package links, and set up Husky hooks locally._

### 🛠️ Common Workspace Commands

You can run commands across all projects using `nx`:

| Command                         | Description                                                         |
| :------------------------------ | :------------------------------------------------------------------ |
| `pnpm build`                    | Build all projects in the workspace.                                |
| `pnpm lint`                     | Lint all projects.                                                  |
| `pnpm test`                     | Run unit tests for all projects.                                    |
| `pnpm format`                   | Run Prettier across the entire workspace.                           |
| `npx nx graph`                  | Open the interactive project dependency graph.                      |
| `npx nx run <project>:<target>` | Run a specific target (e.g., `build`, `dev`, `lint`) for a project. |

---

## Developer Guide

For a detailed breakdown of the monorepo architecture, coding standards, how to add new apps/packages, how to swap out standard boilerplates, and conventional commit rules, please refer to the developer guide:

👉 **[MONOREPO_GUIDE.md](file:///e:/lap_trinh/Project/Linko/MONOREPO_GUIDE.md)**
