import { ApolloServer } from 'apollo-server';
import { GraphQLResponse } from 'apollo-server-plugin-base';
import { GraphQLError } from 'graphql';

import { syncFunctionalRules, syncRules } from './rules-sync';
import { asyncFunctionalRules, asyncRules } from './rules-async';
import { mockServer } from '../mock-server';

const rawSchema = `
type Post {
  id: ID!
  title: String!
  owner: User!
}

type User {
  id: ID!
  email: String
  comments: [Comment]
}

type Comment {
  id: ID!
  text: String!
  owner: User!
  post: Post
}

type Query {
  post(arg: String): Post @authz(rules: [FailingPostExecRule])
  user: User @authz(rules: [PassingPostExecRule])
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
  comments: [Comment]
}

type Comment {
  id: ID!
  text: String!
  owner: User!
  post: Post
}

type Query {
  post(arg: String): Post
  user: User
}
`;

const postQuery = `
  query getPost {
    post(arg: "test_argument") {
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

const authSchema = {
  Query: {
    post: { __authz: { rules: ['FailingPostExecRule'] } },
    user: { __authz: { rules: ['PassingPostExecRule'] } }
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
          describe('post execution rule', () => {
            describe('on query', () => {
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
                await server
                  .executeOperation({
                    query: postQuery
                  })
                  .catch(e => e);

                const ruleArgs =
                  rules.FailingPostExecRule.prototype.execute.mock.calls[0];

                expect(
                  rules.FailingPostExecRule.prototype.execute
                ).toBeCalled();
                expect(
                  rules.FailingPostExecRule.prototype.execute
                ).toBeCalledTimes(1);
                expect(ruleArgs[1]).toEqual({ arg: 'test_argument' });
              });

              it('rules should receive result value and parent value', async () => {
                await server
                  .executeOperation({
                    query: postQuery
                  })
                  .catch(e => e);

                const failingRuleArgs =
                  rules.FailingPostExecRule.prototype.execute.mock.calls[0];

                expect(failingRuleArgs[0]).toBeDefined();
                expect(failingRuleArgs[1]).toBeDefined();
                expect(failingRuleArgs[2]).toHaveProperty('id');
                expect(failingRuleArgs[2]).toHaveProperty('title');
                expect(failingRuleArgs[3]).toEqual({
                  post: failingRuleArgs[2]
                });

                await server
                  .executeOperation({
                    query: userQuery
                  })
                  .catch(e => e);

                const passingRuleArgs =
                  rules.PassingPostExecRule.prototype.execute.mock.calls[0];

                expect(passingRuleArgs[0]).toBeDefined();
                expect(passingRuleArgs[1]).toBeDefined();
                expect(passingRuleArgs[2]).toHaveProperty('id');
                expect(passingRuleArgs[2]).toHaveProperty('email');
                expect(passingRuleArgs[3]).toEqual({
                  user: passingRuleArgs[2]
                });
              });

              it('should not execute not affected rule', async () => {
                await server.executeOperation({
                  query: userQuery
                });

                expect(
                  rules.FailingPostExecRule.prototype.execute
                ).not.toBeCalled();
              });

              it('failing rule should fail query', async () => {
                let result: GraphQLResponse | undefined = undefined;
                let error: GraphQLError | undefined = undefined;
                try {
                  result = await server.executeOperation({
                    query: postQuery
                  });
                } catch (e) {
                  error = e as GraphQLError;
                }

                expect(result && result?.data).toBeUndefined();
                expect(error || result?.errors?.[0]).toBeDefined();
                expect(
                  (error || result?.errors?.[0])?.extensions?.code
                ).toEqual('FORBIDDEN');
              });

              it('passing rule should not fail query', async () => {
                let result;
                let error;
                try {
                  result = await server.executeOperation({
                    query: userQuery
                  });
                } catch (e) {
                  error = e;
                }

                expect(error).toBeUndefined();
                expect(result?.errors).toBeUndefined();
                expect(result?.data).toBeDefined();
              });
            });
          });
        });
      }
    );
  }
);
