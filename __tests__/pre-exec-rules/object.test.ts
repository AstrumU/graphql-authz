import { GraphQLSchema, printSchema } from 'graphql';

import { authZApolloPlugin, AuthZDirective, authZDirective } from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';
import { syncRules } from './rules-sync';
import { asyncRules } from './rules-async';

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

describe.each([
  ['sync', syncRules],
  ['async', asyncRules]
])('%s', (name, rules) => {
  describe('pre execution rule', () => {
    describe('on object', () => {
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
          plugins: [plugin],
          schemaDirectives: { authz: AuthZDirective }
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
        expect(rules.FailingPreExecRule.prototype.execute).toBeCalledTimes(1);
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

      it('rule should be executed for nested entity', async () => {
        const result = await server.executeOperation({
          query: userWithPostsQuery
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors?.[0].extensions?.code).toEqual('FORBIDDEN');
        expect(result.data).toBeUndefined();
      });
    });
  });
});
