import { preExecRule, completeConfig } from '@graphql-authz/core';

import { mockServer } from './mock-server';
import { formatResponse } from './utils';

const rawSchema = `
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

const userQuery = `
  query getUser {
    user {
      id
    }
  }
`;

const postTitleQuery = `
  query getPost {
    post {
      title
    }
  }
`;

const userWithEmailQuery = `
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

const rules = {
  FailingRule: preExecRule()(() => false),
  PassingRule: preExecRule()(() => true)
} as const;

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe('Wildcard types', () => {
      const mockServerParams = {
        integrationMode,
        rules,
        rawSchema,
        rawSchemaWithoutDirectives: rawSchema,
        declarationMode: 'authSchema'
      } as const;

      afterEach(() => {
        jest.clearAllMocks();
      });

      it('should throw on unknown rule', () => {
        let thewError: any | undefined;
        try {
          completeConfig({
            authSchema: {
              '*': { __authz: { rules: ['nonExistingRule'] } },
              User: { __authz: { rules: ['PassingRule'] } }
            },
            rules
          });
        } catch (e) {
          thewError = e;
        }
        expect(thewError).toBeDefined();

        thewError = undefined;
        try {
          completeConfig({
            authSchema: {
              '*': { __authz: { rules: ['FailingRule'] } },
              User: { __authz: { rules: ['PassingRule'] } },
              Looser: {
                email: { __authz: { rules: ['TypoInRule'] } },
                posts: { __authz: { rules: ['PassingRule'] } }
              }
            },
            rules
          });
        } catch (e) {
          thewError = e;
        }
        expect(thewError).toBeDefined();

        thewError = undefined;
        try {
          completeConfig({
            authSchema: {
              '*': { __authz: { rules: ['FailingRule'] } },
              User: { __authz: { rules: ['PassingRule'] } },
              Looser: {
                email: { __authz: { rules: ['PassingRule'] } },
                posts: { __authz: { rules: ['PassingRule'] } }
              }
            },
            rules
          });
        } catch (e) {
          thewError = e;
        }
        expect(thewError).toBeUndefined();
      });
      it('should handle wildcard object', async () => {
        const server = mockServer({
          ...mockServerParams,
          authSchema: {
            '*': { __authz: { rules: ['FailingRule'] } },
            User: { __authz: { rules: ['PassingRule'] } }
          }
        });

        const postResult = formatResponse(
          await server.executeOperation({
            query: postQuery
          })
        );

        expect(postResult?.errors).toHaveLength(1);
        expect(postResult?.errors?.[0].extensions?.code).toEqual('FORBIDDEN');
        try {
          expect(postResult?.data).toBeUndefined();
        } catch {
          expect(postResult?.data?.post).toBeNull();
        }

        const userResult = formatResponse(
          await server.executeOperation({
            query: userQuery
          })
        );

        expect(userResult?.errors).toBeUndefined();
        expect(userResult?.data).toBeDefined();

        const userWithPostsResult = formatResponse(
          await server.executeOperation({
            query: userWithPostsQuery
          })
        );

        expect(userWithPostsResult?.errors).toHaveLength(1);
        expect(userWithPostsResult?.errors?.[0].extensions?.code).toEqual(
          'FORBIDDEN'
        );
        try {
          expect(userWithPostsResult?.data).toBeUndefined();
        } catch {
          expect(userWithPostsResult?.data?.user).toBeNull();
        }
      });

      it('should handle wildcard object wildcard field', async () => {
        const server = mockServer({
          ...mockServerParams,
          authSchema: {
            '*': {
              '*': { __authz: { rules: ['FailingRule'] } }
            },
            Query: {
              user: { __authz: { rules: ['PassingRule'] } }
            },
            User: { id: { __authz: { rules: ['PassingRule'] } } }
          }
        });

        const postResult = formatResponse(
          await server.executeOperation({
            query: postQuery
          })
        );

        expect(postResult?.errors).toHaveLength(1);
        expect(postResult?.errors?.[0].extensions?.code).toEqual('FORBIDDEN');
        try {
          expect(postResult?.data).toBeUndefined();
        } catch {
          expect(postResult?.data?.post).toBeNull();
        }

        const userResult = formatResponse(
          await server.executeOperation({
            query: userQuery
          })
        );

        expect(userResult?.errors).toBeUndefined();
        expect(userResult?.data).toBeDefined();

        const userWithEmailResult = formatResponse(
          await server.executeOperation({
            query: userWithEmailQuery
          })
        );

        expect(userWithEmailResult?.errors).toHaveLength(1);
        expect(userWithEmailResult?.errors?.[0].extensions?.code).toEqual(
          'FORBIDDEN'
        );
        try {
          expect(userWithEmailResult?.data).toBeUndefined();
        } catch {
          expect(userWithEmailResult?.data?.user).toBeNull();
        }

        const userWithPostsResult = formatResponse(
          await server.executeOperation({
            query: userWithPostsQuery
          })
        );

        expect(userWithPostsResult?.errors).toHaveLength(1);
        expect(userWithPostsResult?.errors?.[0].extensions?.code).toEqual(
          'FORBIDDEN'
        );
        try {
          expect(userWithPostsResult?.data).toBeUndefined();
        } catch {
          expect(userWithPostsResult?.data?.user).toBeNull();
        }
      });

      it('should handle wildcard object field', async () => {
        const server = mockServer({
          ...mockServerParams,
          authSchema: {
            '*': {
              id: { __authz: { rules: ['FailingRule'] } }
            },
            User: { id: { __authz: { rules: ['PassingRule'] } } }
          }
        });

        const postResult = formatResponse(
          await server.executeOperation({
            query: postQuery
          })
        );

        expect(postResult?.errors).toHaveLength(1);
        expect(postResult?.errors?.[0].extensions?.code).toEqual('FORBIDDEN');
        try {
          expect(postResult?.data).toBeUndefined();
        } catch {
          expect(postResult?.data?.post).toBeNull();
        }

        const postTitleResult = formatResponse(
          await server.executeOperation({
            query: postTitleQuery
          })
        );

        expect(postTitleResult?.errors).toBeUndefined();
        expect(postTitleResult?.data).toBeDefined();

        const userResult = formatResponse(
          await server.executeOperation({
            query: userQuery
          })
        );

        expect(userResult?.errors).toBeUndefined();
        expect(userResult?.data).toBeDefined();
      });

      it('should handle object wildcard field', async () => {
        const server = mockServer({
          ...mockServerParams,
          authSchema: {
            User: {
              '*': { __authz: { rules: ['FailingRule'] } },
              id: { __authz: { rules: ['PassingRule'] } }
            }
          }
        });

        const userWithEmailResult = formatResponse(
          await server.executeOperation({
            query: userWithEmailQuery
          })
        );

        expect(userWithEmailResult?.errors).toHaveLength(1);
        expect(userWithEmailResult?.errors?.[0].extensions?.code).toEqual(
          'FORBIDDEN'
        );
        try {
          expect(userWithEmailResult?.data).toBeUndefined();
        } catch {
          expect(userWithEmailResult?.data?.user).toBeNull();
        }

        const userResult = formatResponse(
          await server.executeOperation({
            query: userQuery
          })
        );

        expect(userResult?.errors).toBeUndefined();
        expect(userResult?.data).toBeDefined();
      });
    });
  }
);
