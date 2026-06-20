# FOCA AI Rules Index

Read this first. Open only referenced tasks files for current task and testing, if needed check the source of truth as explained bellow. Architectural decisions and tests decisions also have it's onw files. Do not load all by default.

## Non-Negotiables

- Use TypeScript for new code.
- Use Zod for schemas.
- Use Jest for unit tests.
- Keep changes scoped to task.
- Avoid unrelated refactors.
- Avoid `any`, `as any`, `as unknown`. Narrow exceptions allowed for runtime interop (e.g. `import.meta.main`); add a comment explaining why when used.
- Before finish code changes, run relevant `lint`, `typecheck`, `test` target for touched project when available.
- Files and code (variables, constrains, conditionals, tests, tests switches, etc) must be written in english even if the db use portuguese as default
- The DB collunm and enums SHOULD NOT be translated or changed
- Errors are thrown in portuguese

## Routing

- architecture decisions can be found in ./architecture.md

## Defaults

- Optimize for clarity, maintainability, DRY, performance.
- Prefer short single-purpose functions w/ early returns.
- Prefer composition over inheritance.
- Clear names + small helpers, not deep nesting.
- Use `nullish()` for response/external-API schemas where both `null` and `undefined` may appear; use `optional()` for input validation and DB-backed fields where stricter contracts matter.
- Keep tests next to code they cover.
- Prefer parameterized tests + shared fixtures over repetitive inline setup.

## Source Of Truth

- Source of truth lives in `./focaDecisions`;
- Always start checking newest versions first; their named with VNUmberOfVersion;
- Architecture decision can be found in `./architecture.md`
- Testing advices are in `./testing.md`
- Tasks breakdown live in `./tasks`