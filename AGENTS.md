# Agent Instructions

This file contains project-specific instructions for AI agents working on this repository. Please acknowledge that you've read this when we start a session.

## Project Context

The application being built here will be used to build and deploy proof-of-concept development for CIAM systems built on Auth0. We want to be able to work in Auth0 config in this directory, deploy that config to a demo tenant in a safe, non-destructive way, and have an application use that config at runtime to build out application functionality.

There will be a thin serve.ts that pulls in functionality from modules/app to read the config, run validation, then display a list of applications with functionality. Apps that allow login will provide that functionality using the grants they are configured for. The idea is that most/all of the functional code is in a module that can be re-used across demos. Eventually, this will just be tenant config and the app definition with the modules being loaded from NPM or GitHub.

Assume, for now, that the tenant configuration is manually added to this repo and deployed with the app definition. We'll create a new project for each client and start the tenant config from scratch.

## Architecture Notes

- `createApp.ts` sets up the Express app, session, and shared middleware. All startup validation logs warnings but does not exit.
- `clientMiddleware` sets `res.locals.client` and `res.locals.authenticationApi`. Only the client lookup is in a try/catch (404); downstream errors propagate to the Express error handler.
- `createAuthenticationApi` asserts `domain` and `clientId` at construction time - tests that exercise `clientMiddleware` must set `res.locals.auth0Domain`.
- The error handler in `createApp.ts` is currently registered before routes, which means it won't catch async route errors in Express 5. It should be moved after routes are registered.

## Development Workflow

Note that this app code will be used as an example and needs to be developed step-by-step. Please check in with the operator regularly with status and questions about how to implement.

### After Each Coding Block

Follow this checklist **in order** after implementing or modifying code:

1. **Write/Update Tests**
   - Create or update unit tests in `*.test.ts` files
   - Cover all new functionality and edge cases

2. **Build**
   - Run `npm run build` to check TypeScript
   - Fix any compilation errors

3. **Run Tests**
   - Run `npm test` to execute all tests
   - All tests must pass - fix failures before proceeding

4. **Lint Code**
   - Run `npm run lint` to check TypeScript types and ESLint rules
   - Fix all linting errors before proceeding

5. **Format Code**
   - Run `npm run format` to apply prettier formatting
   - Commit formatted code only

6. **Update Documentation**
   - Update `README.md` if user-facing tasks have changed

### Code Style

- Use `//` for single-line comments, not `/** */`
- Minimize comments - code should be self-documenting
- One module at a time - complete workflow before moving on
- Use guard clauses to return/break/continue early
- Bias towards more clear variable names rather than short ones
- Separate out each API call into it's own module for educational purposes
- Do not duplicate documentation across README files and code comments
- Use the built-in Node strict assert to guard against missing values
