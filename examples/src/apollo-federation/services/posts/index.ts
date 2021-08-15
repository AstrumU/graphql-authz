import { ApolloServer, gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import {
  authZGraphQLDirective,
  directiveTypeDefs
} from '@astrumu/graphql-authz';

import { posts } from '../../db';
import { authZRules } from '../../rules';

const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

const typeDefs = gql`
  ${authZDirectiveTypeDefs}
  extend type User @key(fields: "id") {
    id: ID! @external
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

  extend type Query {
    posts: [Post!]!
    post(id: ID!): Post
  }

  extend type Mutation {
    publishPost(postId: ID!): Post! @authz(rules: [CanPublishPost])
  }
`;

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
  schema: buildFederatedSchema([
    {
      typeDefs,
      resolvers
    }
  ])
});

server.listen({ port: 4002 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
