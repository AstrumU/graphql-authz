import gql from 'graphql-tag';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';

import { posts } from '../../db';

// schema
const typeDefs = gql`
  extend type User @key(fields: "id") {
    id: ID! @external
    posts: [Post!]!
  }

  type Post {
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

  extend type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }

  extend type Mutation {
    publishPost(postId: ID!): Post!
  }
`;

// resolvers
const resolvers = {
  Query: {
    posts: () => posts,
    post: (parent: unknown, args: Record<string, unknown>) =>
      posts.find(({ id }) => id === args.id),
    _service: () => ({
      sdl: typeDefs.loc?.source.body
    })
  },
  Mutation: {
    publishPost: (parent: unknown, args: Record<string, unknown>) => {
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

const server = new ApolloServer({
  schema: buildSubgraphSchema([
    {
      typeDefs,
      resolvers
    }
  ])
});

startStandaloneServer(server, { listen: { port: 4002 } }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
