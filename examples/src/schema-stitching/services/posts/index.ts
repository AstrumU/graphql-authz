import { ApolloServer, gql } from 'apollo-server';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } =
  stitchingDirectives();

const typeDefs = gql`
  ${stitchingDirectivesTypeDefs}

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

  enum AuthZRules {
    IsAuthenticated
    IsAdmin
    CanReadPost
    CanPublishPost
  }

  # this is a common boilerplate
  input AuthZDirectiveCompositeRulesInput {
    and: [AuthZRules]
    or: [AuthZRules]
    not: AuthZRules
  }

  # this is a common boilerplate
  input AuthZDirectiveDeepCompositeRulesInput {
    id: AuthZRules
    and: [AuthZDirectiveDeepCompositeRulesInput]
    or: [AuthZDirectiveDeepCompositeRulesInput]
    not: AuthZDirectiveDeepCompositeRulesInput
  }

  # this is a common boilerplate
  directive @authz(
    rules: [AuthZRules]
    compositeRules: [AuthZDirectiveCompositeRulesInput]
    deepCompositeRules: [AuthZDirectiveDeepCompositeRulesInput]
  ) on FIELD_DEFINITION | OBJECT | INTERFACE
`;

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
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

server.listen(4002).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
