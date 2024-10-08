import { ApolloServer } from '@apollo/server';

import { syncRules, syncFunctionalRules } from './rules-sync';
import { asyncRules, asyncFunctionalRules } from './rules-async';
import { mockServer } from '../mock-server';
import { formatResponse } from '../utils';

const rawSchema = `
type Post {
  id: ID!
  title(arg: String): String! @authz(rules: [FailingPreExecRule])
  owner: User!
}

type User {
  id: ID!
  email: String @authz(rules: [PassingPreExecRule])
  posts: [Post]
}

type Query {
  post: Post
  user: User
}
`;

const rawSchemaWithoutDirectives = `
type Post {
  id: ID!
  title(arg: String): String!
  owner: User!
}

type User {
  id: ID!
  email: String
  posts: [Post]
}

type Query {
  post: Post
  user: User
}
`;

const postQuery = `
  query getPost {
    post {
      id
    }
  }
`;

const postWithTitleQuery = `
  query getPost {
    post {
      id
      title(arg: "test_argument")
    }
  }
`;

const userQuery = `
  query getUser {
    user {
      id
      email
    }
  }
`;

const userWithPostsQuery = `
query getUser {
  user {
    id
    email
    posts {
      id
    }
  }
}
`;

const userWithPostTitleQuery = `
query getUser {
  user {
    id
    email
    posts {
      id
      title
    }
  }
}
`;

const authSchema = {
  Post: {
    title: {
      __authz: { rules: ['FailingPreExecRule'] }
    }
  },
  User: {
    email: {
      __authz: { rules: ['PassingPreExecRule'] }
    }
  }
};

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe.each(['directive', 'authSchema'] as const)(
      '%s',
      declarationMode => {
        describe.each([
          ['sync', syncRules],
          ['async', asyncRules],
          ['sync functional', syncFunctionalRules],
          ['async functional', asyncFunctionalRules]
        ] as const)('%s', (name, rules) => {
          describe('pre execution rule', () => {
            describe('on object field', () => {
              let server: ApolloServer;

              beforeAll(() => {
                server = mockServer({
                  integrationMode,
                  rules,
                  rawSchema,
                  rawSchemaWithoutDirectives,
                  declarationMode,
                  authSchema
                });
              });

              afterEach(() => {
                jest.clearAllMocks();
              });

              it('should execute affected rule', async () => {
                await server.executeOperation({
                  query: postWithTitleQuery
                });

                expect(rules.FailingPreExecRule.prototype.execute).toBeCalled();
                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).toBeCalledTimes(1);
              });

              it('should not execute not affected rule', async () => {
                await server.executeOperation({
                  query: userQuery
                });

                await server.executeOperation({
                  query: postQuery
                });

                await server.executeOperation({
                  query: userWithPostsQuery
                });

                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).not.toBeCalled();
              });

              it('failing rule should fail query', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: postWithTitleQuery
                  })
                );

                expect(result?.errors).toHaveLength(1);
                expect(result?.errors?.[0].extensions?.code).toEqual(
                  'FORBIDDEN'
                );
                try {
                  expect(result?.data).toBeUndefined();
                } catch {
                  expect(result?.data?.post).toBeNull();
                }
              });

              it('passing rule should not fail query', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: userQuery
                  })
                );

                expect(result?.errors).toBeUndefined();
                expect(result?.data).toBeDefined();
              });

              it('rule should be executed for nested entity', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: userWithPostTitleQuery
                  })
                );

                expect(rules.FailingPreExecRule.prototype.execute).toBeCalled();
                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).toBeCalledTimes(1);

                expect(result?.errors).toHaveLength(1);
                expect(result?.errors?.[0].extensions?.code).toEqual(
                  'FORBIDDEN'
                );
                try {
                  expect(result?.data).toBeUndefined();
                } catch {
                  expect(result?.data?.user).toBeNull();
                }
              });

              it('should skip fields with @skip(if: true) directive', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `query getUser($shouldSkip: Boolean!) {
                      user {
                        id
                        email @skip(if: $shouldSkip)
                      }
                    }`,
                    variables: {
                      shouldSkip: true
                    }
                  })
                );

                expect(
                  rules.PassingPreExecRule.prototype.execute
                ).not.toBeCalled();
                expect(result?.data?.user).toBeDefined();
                expect(result?.data?.user).not.toHaveProperty('email');
              });

              it('should not skip fields with @skip(if: false) directive', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `query getUser($shouldSkip: Boolean!) {
                      user {
                        id
                        email @skip(if: $shouldSkip)
                      }
                    }`,
                    variables: {
                      shouldSkip: false
                    }
                  })
                );

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
                expect(result?.data?.user).toBeDefined();
                expect(result?.data?.user).toHaveProperty('email');
              });

              it('should skip fields with @include(if: false) directive', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `query getUser($shouldInclude: Boolean!) {
                      user {
                        id
                        email @include(if: $shouldInclude)
                      }
                    }`,
                    variables: {
                      shouldInclude: false
                    }
                  })
                );

                expect(
                  rules.PassingPreExecRule.prototype.execute
                ).not.toBeCalled();
                expect(result?.data?.user).toBeDefined();
                expect(result?.data?.user).not.toHaveProperty('email');
              });

              it('should not skip fields with @include(if: true) directive', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `query getUser($shouldInclude: Boolean!) {
                      user {
                        id
                        email @include(if: $shouldInclude)
                      }
                    }`,
                    variables: {
                      shouldInclude: true
                    }
                  })
                );

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
                expect(result?.data?.user).toBeDefined();
                expect(result?.data?.user).toHaveProperty('email');
              });

              it('should handle fragments', async () => {
                await server.executeOperation({
                  query: `query getUser {
                user {
                  id
                  ...Fragment1
                }
              }
              fragment Fragment1 on User {
                ...Fragment2
              }
              fragment Fragment2 on User {
                email
              }
              `
                });

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
              });

              it('should handle inline fragments', async () => {
                await server.executeOperation({
                  query: `
                    query getUser {
                      user {
                        id
                        ... on User {
                          email
                        }
                      }
                    }
                  `
                });

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
              });

              it('should handle aliases', async () => {
                await server.executeOperation({
                  query: `query getUser {
                user {
                  id
                  emailAlias: email
                }
              }
              `
                });

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
              });

              it('should handle aliases in fragments', async () => {
                await server.executeOperation({
                  query: `query getUser {
                user {
                  id
                  ...Fragment1
                }
              }
              fragment Fragment1 on User {
                ...Fragment2
              }
              fragment Fragment2 on User {
                emailAlias: email
              }
              `
                });

                expect(rules.PassingPreExecRule.prototype.execute).toBeCalled();
              });
            });
          });
        });
      }
    );
  }
);
