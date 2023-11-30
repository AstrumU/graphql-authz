import gql from 'graphql-tag';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { directiveTypeDefs } from '@graphql-authz/core';
import { authZGraphQLDirective } from '@graphql-authz/directive';

import { authZRules } from '../../lib/rules';

// authz directive to print definitions to schema
const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

const { stitchingDirectivesTypeDefs } = stitchingDirectives();

// schema
const typeDefs = gql`
  ${stitchingDirectivesTypeDefs}
  ${authZDirectiveTypeDefs}

  type User @key(selectionSet: "{ id }") {
    id: ID!
    posts: [Post!]!
  }

  type Post @authz(rules: [CanReadPost]) {
    id: ID!
    title: String!
    body: String!
    status: Status!
    author: User!
  }

  enum Status {
    draft
    public
  }

  type Query {
    posts: [Post!]!
    post(id: ID!): Post
    _user(id: ID!): User! @merge(keyField: "id")
    _sdl: String!
  }

  type Mutation {
    publishPost(postId: ID!): Post! @authz(rules: [CanPublishPost])
  }
`;

// data
const posts = [
  {
    id: '1',
    title: 'Post01 title',
    body: 'Post01 body',
    status: 'draft',
    authorId: '1'
  },
  {
    id: '2',
    title: 'Post02 title',
    body: 'Post02 body',
    status: 'public',
    authorId: '1'
  }
];

// resolvers
const resolvers = {
  Query: {
    posts: () => posts,
    post: (parent: unknown, args: { id: string }) =>
      posts.find(({ id }) => id === args.id),
    _user: (parent: unknown, args: { id: string }) => ({ id: args.id }),
    _sdl: () => typeDefs.loc?.source.body
  },
  Mutation: {
    publishPost: (parent: unknown, args: { postId: string }) => {
      const post = posts.find(({ id }) => id === args.postId);
      if (!post) {
        throw new Error('Not Found');
      }
      post.status = 'public';
      return post;
    }
  },
  Post: {
    author: (parent: { authorId: string }) => ({
      id: parent.authorId
    })
  },
  User: {
    posts: (parent: { id: string }) =>
      posts.filter(({ authorId }) => authorId === parent.id)
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
