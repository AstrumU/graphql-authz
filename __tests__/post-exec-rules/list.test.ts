import { ApolloServer } from '@apollo/server';

import { mockServer } from '../mock-server';
import { formatResponse } from '../utils';
import { asyncRules } from './rules-async';

const rawSchema = `
type Post {
  id: ID!
  title: String!
  owner: User!
  comments: [Comment!]!
}

type User {
  id: ID!
  email: String
  posts: [Post]
  comments: [Comment]
  likes: [Like!]!
  likesListOfLists: [[[Like!]]]!
  stringsListOfLists: [[[String!]]]!
}

type Comment @authz(rules: [FailingPostExecRule]) {
  id: ID!
  text: String!
  owner: User!
  post: Post
}

type Like @authz(rules: [PassingPostExecRule]) {
  id: ID!
  post: Post!
}

type Query {
  user: User
  userWithLikes: User
  userWithNullPosts: User
  userWithCommentsAndLikesListOfLists: User
  userWithPostsAndLikesListOfLists: User
  userWithPostsAndStringsListOfLists: User
}
`;

const rawSchemaWithoutDirectives = `
type Post {
  id: ID!
  title: String!
  owner: User!
  comments: [Comment!]!
}

type User {
  id: ID!
  email: String
  posts: [Post]
  comments: [Comment]
  likes: [Like!]!
  likesListOfLists: [[[Like!]]]!
  stringsListOfLists: [[[String!]]]!
}

type Comment {
  id: ID!
  text: String!
  owner: User!
  post: Post
}

type Like {
  id: ID!
  post: Post!
}

type Query {
  user: User
  userWithLikes: User
  userWithNullPosts: User
  userWithCommentsAndLikesListOfLists: User
  userWithPostsAndLikesListOfLists: User
  userWithPostsAndStringsListOfLists: User
}
`;

const userQuery = `
  query getUser {
    user {
      posts {
        id
      }
      comments {
        id
      }
    }
  }
`;

const userWithNullPostsQuery = `
  query userWithNullPosts {
    userWithNullPosts {
      posts {
        id
      }
      comments {
        id
      }
    }
  }
`;

const userCommentsAndLikesListOfListsQuery = `
  query userLikesListOfLists {
    userWithCommentsAndLikesListOfLists {
      likesListOfLists {
        id
      }
      comments {
        id
      }
    }
  }
`;

const userPostsAndLikesListOfListsQuery = `
  query userLikesListOfLists {
    userWithPostsAndLikesListOfLists {
      likesListOfLists {
        id
      }
      posts {
        id
      }
    }
  }
`;

const userPostsAndStringsListOfListsQuery = `
  query userPostsAndStringsListOfLists {
    userWithPostsAndStringsListOfLists {
      stringsListOfLists
      posts {
        id
      }
    }
  }
`;

const userLikesQuery = `
  query userLikes {
    userWithLikes {
      likes {
        post {
          comments {
            id
          }
        }
      }
    }
  }
`;

const authSchema = {
  Comment: {
    __authz: { rules: ['FailingPostExecRule'] }
  },
  Like: {
    __authz: { rules: ['PassingPostExecRule'] }
  }
};

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe.each(['directive', 'authSchema'] as const)(
      '%s',
      declarationMode => {
        describe('post execution rule with list result', () => {
          let server: ApolloServer;

          beforeAll(() => {
            server = mockServer({
              integrationMode,
              rules: asyncRules,
              rawSchema,
              rawSchemaWithoutDirectives,
              declarationMode,
              authSchema,
              mocks: {
                Query: () => ({
                  user: () => ({
                    posts: [],
                    comments: [{ id: 'comment_id' }]
                  }),
                  userWithNullPosts: () => ({
                    posts: null,
                    comments: [{ id: 'comment_id' }]
                  }),
                  userWithLikes: () => ({
                    likes: []
                  }),
                  userWithCommentsAndLikesListOfLists: () => ({
                    likesListOfLists: [
                      [[{ id: 'like_id01' }, { id: 'like_id02' }]],
                      [[{ id: 'like_id03' }, { id: 'like_id04' }]]
                    ],
                    comments: [{ id: 'comment_id' }]
                  }),
                  userWithPostsAndLikesListOfLists: () => ({
                    likesListOfLists: [
                      [
                        [{ id: 'like_id01' }, { id: 'like_id02' }],
                        [{ id: 'like_id03' }, { id: 'like_id04' }]
                      ]
                    ],
                    posts: [{ id: 'post_id' }]
                  }),
                  userWithPostsAndStringsListOfLists: () => ({
                    stringsListOfLists: [
                      [
                        ['test01', 'test02'],
                        ['test03', 'test04']
                      ],
                      [['test05']]
                    ],
                    posts: [{ id: 'post_id' }]
                  })
                })
              }
            });
          });

          afterEach(() => {
            jest.clearAllMocks();
          });

          it('should execute affected rule when response contains empty lists', async () => {
            const result = await server
              .executeOperation({
                query: userQuery
              })
              .catch(e => e);

            const error = formatResponse(result)?.errors?.[0];

            try {
              expect(
                result instanceof Error || error instanceof Error
              ).toBeTruthy();
            } catch {
              expect(error).toMatchObject({
                message: 'Unauthorized!',
                extensions: { code: 'FORBIDDEN' }
              });
            }
            expect(
              asyncRules.FailingPostExecRule.prototype.execute
            ).toBeCalledTimes(1);
          });

          it('should handle nullable lists', async () => {
            const result = await server
              .executeOperation({
                query: userWithNullPostsQuery
              })
              .catch(e => e);

            const error = formatResponse(result)?.errors?.[0];

            try {
              expect(
                result instanceof Error || error instanceof Error
              ).toBeTruthy();
            } catch {
              expect(error).toMatchObject({
                message: 'Unauthorized!',
                extensions: { code: 'FORBIDDEN' }
              });
            }
            expect(
              asyncRules.FailingPostExecRule.prototype.execute
            ).toBeCalledTimes(1);
          });

          it('should handle empty lists in result with nested selection set', async () => {
            const result = await server.executeOperation({
              query: userLikesQuery
            });

            expect(
              asyncRules.FailingPostExecRule.prototype.execute
            ).not.toBeCalled();
            expect(
              'singleResult' in result.body && result.body.singleResult.data
            ).toEqual({
              userWithLikes: { likes: [] }
            });
          });

          it('should handle failing list of lists', async () => {
            const result = await server
              .executeOperation({
                query: userCommentsAndLikesListOfListsQuery
              })
              .catch(e => e);

            const error = formatResponse(result)?.errors?.[0];

            try {
              expect(
                result instanceof Error || error instanceof Error
              ).toBeTruthy();
            } catch {
              expect(error).toMatchObject({
                message: 'Unauthorized!',
                extensions: { code: 'FORBIDDEN' }
              });
            }
            expect(
              asyncRules.FailingPostExecRule.prototype.execute
            ).toBeCalled();
            expect(
              asyncRules.PassingPostExecRule.prototype.execute
            ).toBeCalledTimes(4);
          });

          it('should handle passing list of lists', async () => {
            const result = formatResponse(
              await server.executeOperation({
                query: userPostsAndLikesListOfListsQuery
              })
            );

            expect(
              asyncRules.PassingPostExecRule.prototype.execute
            ).toBeCalledTimes(4);
            expect(result?.data).toEqual({
              userWithPostsAndLikesListOfLists: {
                likesListOfLists: [
                  [
                    [{ id: 'like_id01' }, { id: 'like_id02' }],
                    [{ id: 'like_id03' }, { id: 'like_id04' }]
                  ]
                ],
                posts: [{ id: 'post_id' }]
              }
            });
          });

          it('should handle passing list of lists of strings', async () => {
            const result = formatResponse(
              await server.executeOperation({
                query: userPostsAndStringsListOfListsQuery
              })
            );

            expect(result?.data).toEqual({
              userWithPostsAndStringsListOfLists: {
                stringsListOfLists: [
                  [
                    ['test01', 'test02'],
                    ['test03', 'test04']
                  ],
                  [['test05']]
                ],
                posts: [{ id: 'post_id' }]
              }
            });
          });
        });
      }
    );
  }
);
