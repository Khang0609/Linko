# GitFlow Guide for Developers

This document details our branching model, workflow, hotfix procedure, and best practices to ensure seamless collaboration and prevent code conflicts.

---

## 1. Branching Model Overview

Our GitFlow model consists of two main categories: **Permanent Branches** and **Temporary Branches**.

### Permanent Branches

- **`main` (or `master`):** Contains production-ready code. It must remain absolute stable, fully tested, and ready for end-users. Direct commits are strictly prohibited.
- **`develop`:** The main integration branch for the next release. It contains the latest delivered development changes for the sprint.

### Temporary Branches (Deleted after merging)

- **`feature/*`:** Used to develop new features or tasks.
- **`release/*`:** Used to prepare for an official release (testing, minor bug fixes).
- **`hotfix/*`:** Used to apply urgent patches directly to the production environment.

---

## 2. GitFlow Workflow for Developers

When working on a new Jira task, never commit directly to `develop`. Create a dedicated feature branch instead.

- **Base Branch:** `develop`
- **Merge Target:** `develop`
- **Naming Convention:** `feature/feature-name` or `feature/JIRA-123-login-page`

### Developer 5-Step Guide:

1.  **Create Local Branch:** Ensure your local `develop` is up-to-date, then branch off.
    ```bash
    git checkout develop
    git pull origin develop
    git checkout -b feature/login-page
    ```
2.  **Create a Draft Pull Request (MANDATORY):** After your first commit, push to remote and open a **Draft Pull Request** toward `develop` so team leads can track progress early.
    ```bash
    git push origin feature/login-page
    ```
    _(On GitHub/GitLab, click the arrow next to "Create Pull Request" and select **Create Draft Pull Request**)._
3.  **Code and Sync:** Continue coding, committing, and pushing regularly to update the Draft PR.
    ```bash
    git add .
    git commit -m "feat: add login form validation"
    git push origin feature/login-page
    ```
4.  **Team Lead Review:** Once the task is 100% complete and self-tested, notify your Team Lead. They will review the code, optimize where needed, and mark it as **Ready for Review** to convert it into an official PR.
5.  **Final PM Approval:** The Project Manager performs a final high-level review against requirements. Once approved and merged, your code officially integrates into `develop`.

---

## 3. Hotfix Procedure

When a critical bug occurs on Production (e.g., app crashes, payment failures) that cannot wait for the next release cycle, a hotfix branch is required.

- **Base Branch:** `main` (to isolate and fix the exact production error)
- **Merge Target:** Both `main` AND `develop`
- **Naming Convention:** `hotfix/v1.0.1-fix-payment`

---

## 4. Team Best Practices

Adhere to these strict guidelines to maintain a clean Git history and avoid integration issues:

1.  **No Direct Commits:** Never commit directly to `main` or `develop`. All changes must go through a Pull Request and require at least one approval.
2.  **Pull Frequently:** Before starting your day or creating a PR, pull the latest changes from `develop` into your feature branch to resolve conflicts locally early.
3.  **Meaningful Commits:** Write clear and purposeful commit messages. Following **Conventional Commits** (e.g., `feat:...`, `fix:...`, `refactor:...`) is highly encouraged. Avoid meaningless names like "fix bug" or "update".
4.  **Clean Up:** Delete both local and remote feature branches immediately after a successful merge to prevent repository clutter.
