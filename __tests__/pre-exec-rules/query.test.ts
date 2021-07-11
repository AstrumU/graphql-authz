import { GraphQLSchema, printSchema } from 'graphql';

import { authZApolloPlugin, authZDirective } from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';
import { syncRules } from './rules-sync';
import { asyncRules } from './rules-async';

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
  post(arg: String): Post @authz(rules: [FailingPreExecRule])
  user: User @authz(rules: [PassingPreExecRule])
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

describe.each([
  ['sync', syncRules],
  ['async', asyncRules]
])('%s', (name, rules) => {
  describe('pre execution rule', () => {
    describe('on query', () => {
      let server: ApolloServerMock;
      let typeDefs: string;

      beforeAll(async () => {
        const plugin = authZApolloPlugin(rules);
        const directive = authZDirective(rules);
        const directiveSchema = new GraphQLSchema({
          directives: [directive]
        });

        typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

        server = new ApolloServerMock({
          typeDefs,
          mocks: true,
          mockEntireSchema: true,
          plugins: [plugin]
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
        const ruleArgs =
          // @ts-expect-error
          rules.FailingPreExecRule.prototype.execute.mock.calls[0];

        expect(rules.FailingPreExecRule.prototype.execute).toBeCalled();
        expect(rules.FailingPreExecRule.prototype.execute).toBeCalledTimes(1);
        expect(ruleArgs[1]).toEqual({ arg: 'test_argument' });
      });

      it('should not execute not affected rule', async () => {
        await server.executeOperation({
          query: userQuery
        });

        expect(rules.FailingPreExecRule.prototype.execute).not.toBeCalled();
      });

      it('failing rule should fail query', async () => {
        const result = await server.executeOperation({
          query: postQuery
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0].extensions?.code).toEqual('FORBIDDEN');
        expect(result.data).toBeUndefined();
      });

      it('passing rule should not fail query', async () => {
        const result = await server.executeOperation({
          query: userQuery
        });

        expect(result.errors).toBeUndefined();
        expect(result.data).toBeDefined();
      });
    });
  });
});
