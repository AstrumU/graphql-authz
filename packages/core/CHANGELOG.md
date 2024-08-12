# @graphql-authz/core

## 1.3.2

### Patch Changes

- adf7272: Fix not applied type-specific pre-exec rules when union or interface is used.
- 06ffc4b: Migrate from yarn to pnpm.
- 6be6e7d: Bump Typescript

## 1.3.1

### Patch Changes

- 9e18f19: Upgrade graphql to v16.8.1 and @graphql-tools to v9._._/v10._._

## 1.3.0

### Minor Changes

- d832980: Check if rule string used in authSchema exists in rules definition

### Patch Changes

- 2e1d0d2: build(deps): bump ansi-regex from 3.0.0 to 3.0.1
- d37c3aa: build(deps): bump shell-quote from 1.7.2 to 1.7.3
- 5a01069: build(deps): bump node-fetch from 2.6.1 to 2.6.7
- 9776c9d: build(deps-dev): bump apollo-server from 2.25.0 to 2.25.3 in /examples
- 7b7ef0f: build(deps): bump minimist from 1.2.5 to 1.2.6 in /examples
- fd8730b: return undefined when a field that does exist is requested
- fa98a09: build(deps): bump minimist from 1.2.5 to 1.2.6
- c1870e8: build(deps-dev): bump apollo-server-core from 3.4.0 to 3.10.1
- bf393f7: build(deps): bump follow-redirects from 1.14.5 to 1.14.8 in /examples
- e9e080a: build(deps): bump cross-fetch from 3.1.4 to 3.1.5 in /examples

## 1.2.1

### Patch Changes

- deb82f5: Correctly handle queries with \_\_typename

## 1.2.0

### Minor Changes

- 71c7353: Add wildcards support

## 1.1.0

### Minor Changes

- 5d89b58: Ignore introspection types
- 5e7b5a9: wrapExecuteFn optimization
- 608da03: wrapExecuteFn supports multiple arguments
- ff46a32: Support of string type for error and notError options of preExecRule and postExecRule functions
- 64cad9d: Compatibility with GraphQL v16 and Apollo Server v3
