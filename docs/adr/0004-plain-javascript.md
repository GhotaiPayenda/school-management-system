# Plain JavaScript, not TypeScript

The frontend is written in plain JavaScript with Vite. TypeScript was proposed and explicitly rejected by the project owner, so there is no compile-time type layer; shared API shapes are enforced at runtime with Zod where validation matters, and documented with JSDoc where it aids navigation.

**Considered options**: TypeScript — rejected by owner preference, despite its value on a system of this size.

**Consequences**: refactors are riskier, API payload mistakes surface at runtime, and discipline in naming and module boundaries matters more. Zod schemas are the source of truth for form and response validation.
