# Repository identity evidence

## Selected canonical V1 package

- Name: `ados-mission-control`
- Absolute root: `D:\ADOS Mission Control`
- Git repository: no
- Package version: `1.0.0`
- Framework: Next.js `15.5.20`, React `19.2.7`, TypeScript `5.9.3`
- Branch / HEAD / remote: not applicable; no Git metadata was invented
- Identity proof: `package.json`, `README.md`, `PRODUCT_BRIEF.md`, `app/`, `components/`, `lib/broker/`, the V1 route tree, and the package-local implementation mission all identify ADOS Mission Control / The Black Agency Command Deck. This package has the live read-only broker and version 1.0 V1 implementation.

## Read-only comparison candidates

1. `D:\agent-development-os-mission-control`
   - Git branch: `main`
   - HEAD: `942c42deb30b93fe406d74d830a8686ab63cf0ec`
   - Remote: none
   - Package: `ados-mission-control@0.1.0`
   - Documentation explicitly labels it a mock-data-only foundation with no live ADOS connection.
   - Pre-existing untracked file: `tsconfig.tsbuildinfo`.
2. `D:\agent-development-os-mission-control-cursor-live-integration`
   - Git branch: `cursor/mission-control-live-integration`
   - HEAD: `942c42deb30b93fe406d74d830a8686ab63cf0ec`
   - Remote: none
   - Linked worktree of the same mock-data foundation.
   - Pre-existing untracked file: `evidence/mission-control-integration/dispatch-result.json`.

Both comparison candidates retained the same branch, HEAD, and pre-existing status after implementation. `D:\agent-development-os-orchestrator` was read only and was never selected as an application repository.
