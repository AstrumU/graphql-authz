import { ApolloServer } from '@apollo/server';

import { syncFunctionalRules, syncRules } from './rules-sync';
import { asyncFunctionalRules, asyncRules } from './rules-async';
import { mockServer } from '../mock-server';
import { formatResponse } from '../utils';

const rawSchema = `
type Post @authz(rules: [FailingPreExecRule]) {
  id: ID!
  title: String!
  owner: User!
}

type User @authz(rules: [PassingPreExecRule]) {
  id: ID!
  email: String
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
  title: String!
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
      title
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
        ])('%s', (name, rules) => {
          describe('pre execution rule', () => {
            describe('on object', () => {
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
                  query: postQuery
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

                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).not.toBeCalled();
              });

              it('failing rule should fail query', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: postQuery
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
                    query: userWithPostsQuery
                  })
                );

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

              it('rule should be executed for fragment', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `
                      query getPost {
                        post {
                          id
                          ...Fragment1
                        }
                      }
                      fragment Fragment1 on Post {
                        ...Fragment2
                      }
                      fragment Fragment2 on Post {
                        title
                      }
                    `
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

              it('rule should be executed for inline fragment', async () => {
                const result = formatResponse(
                  await server.executeOperation({
                    query: `
                      query getPost {
                        post {
                          id
                          ... on Post {
                            title
                          }
                        }
                      }
                    `
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
            });
          });
        });
      }
    );
  }
);
