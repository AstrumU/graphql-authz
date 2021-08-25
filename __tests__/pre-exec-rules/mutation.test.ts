import { syncFunctionalRules, syncRules } from './rules-sync';
import { asyncFunctionalRules, asyncRules } from './rules-async';
import { ApolloServerMock, mockServer } from '../mock-server';

const rawSchema = `
type Post {
  id: ID!
  title: String!
  owner: User!
}

type User {
  id: ID!
  email: String
}

type Query {
  dummy: Boolean
}

type Mutation {
  createPost(arg: String): Post @authz(rules: [FailingPreExecRule])
  createUser: User @authz(rules: [PassingPreExecRule])
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
}

type Query {
  dummy: Boolean
}

type Mutation {
  createPost(arg: String): Post
  createUser: User
}
`;

const createPostMutation = `
  mutation createPost {
    createPost(arg: "test_argument") {
      id
      title
    }
  }
`;

const createUserMutation = `
  mutation createUser {
    createUser {
      id
      email
    }
  }
`;

const authSchema = {
  Mutation: {
    createPost: { __authz: { rules: ['FailingPreExecRule'] } },
    createUser: { __authz: { rules: ['PassingPreExecRule'] } }
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
            describe('on mutation', () => {
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
                  query: createPostMutation
                });

                const ruleArgs =
                  rules.FailingPreExecRule.prototype.execute.mock.calls[0];

                expect(rules.FailingPreExecRule.prototype.execute).toBeCalled();
                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).toBeCalledTimes(1);
                expect(ruleArgs[1]).toEqual({ arg: 'test_argument' });
              });

              it('should not execute not affected rule', async () => {
                await server.executeOperation({
                  query: createUserMutation
                });

                expect(
                  rules.FailingPreExecRule.prototype.execute
                ).not.toBeCalled();
              });

              it('failing rule should fail query', async () => {
                const result = await server.executeOperation({
                  query: createPostMutation
                });

                expect(result.errors).toHaveLength(1);
                expect(result.errors?.[0].extensions?.code).toEqual(
                  'FORBIDDEN'
                );
                expect(result.data).toBeUndefined();
              });

              it('passing rule should not fail query', async () => {
                const result = await server.executeOperation({
                  query: createUserMutation
                });

                expect(result.errors).toBeUndefined();
                expect(result.data).toBeDefined();
              });
            });
          });
        });
      }
    );
  }
);
