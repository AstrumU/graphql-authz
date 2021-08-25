import { syncFunctionalRules, syncRules } from './rules-sync';
import { asyncFunctionalRules, asyncRules } from './rules-async';
import { ApolloServerMock, mockServer } from '../mock-server';

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
              let server: ApolloServerMock;

              beforeAll(async () => {
                server = mockServer({
                  integrationMode,
                  rules,
                  rawSchema,
                  rawSchemaWithoutDirectives,
                  declarationMode,
                  authSchema
                });

                await server.willStart();
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
                const result = await server.executeOperation({
                  query: postQuery
                });

                expect(result.errors).toHaveLength(1);
                expect(result.errors?.[0].extensions?.code).toEqual(
                  'FORBIDDEN'
                );
                expect(result.data).toBeUndefined();
              });

              it('passing rule should not fail query', async () => {
                const result = await server.executeOperation({
                  query: userQuery
                });

                expect(result.errors).toBeUndefined();
                expect(result.data).toBeDefined();
              });

              it('rule should be executed for nested entity', async () => {
                const result = await server.executeOperation({
                  query: userWithPostsQuery
                });

                expect(result.errors).toHaveLength(1);
                expect(result.errors?.[0].extensions?.code).toEqual(
                  'FORBIDDEN'
                );
                expect(result.data).toBeUndefined();
              });
            });
          });
        });
      }
    );
  }
);
