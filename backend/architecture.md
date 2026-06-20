# Architecture

When read: open when change file organization, service boundaries, dependency flow, or error handling.

## Core Principles

- Organize code by feature, not file type.
- Keep related files close.
- Prefer composition over inheritance.
- Follow single responsibility when improve clarity.
- Use dependency injection when improve testability.

## Change Scope

- Make smallest change that fully solve task.
- Preserve established patterns unless clear reason to improve.
- Improve local typesafety + maintainability when touch existing code, but avoid broad incidental rewrites.

## Error Handling

- Handle failures deliberately.
- Return or throw errors at right boundary, not swallow.

## Decisions: 
- When faced with a method with too many if elses perform Replace Conditional with Polymorphism;
- DB related code must be written in it's relative repository class, 
- If a type is exported from a file then it should live in it's onw file, the file name must have the same name as the class file but with .types.ts;
- Code shared between routes may be extracted to decorators, but always ask questions before doing,
