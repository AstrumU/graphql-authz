import express, { RequestHandler, Request as ExpressRequest } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { execute } from 'graphql';

import {
  directiveTypeDefs,
  postExecRule,
  preExecRule,
  wrapExecuteFn
} from '@graphql-authz/core';
import {
  authZDirective,
  authZGraphQLDirective
} from '@graphql-authz/directive';
import { makeExecutableSchema } from '@graphql-tools/schema';

const { authZDirectiveTransformer } = authZDirective();

interface Request extends ExpressRequest {
  user?: {
    id: string;
    role: string;
  } | null;
}

type Context = Request;

// data
const users = [
  {
    id: '1',
    username: 'user01',
    email: 'user01@gmail.com',
    role: 'Customer'
  },
  {
    id: '2',
    username: 'user02',
    email: 'user02@gmail.com',
    role: 'Admin'
  }
];

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

// rules
const IsAuthenticated = preExecRule({
  error: 'User is not authenticated'
})((context: Context) => !!context.user);

const IsAdmin = preExecRule({
  error: 'User is not admin'
})((context: Context) => context.user?.role === 'Admin');

const CanReadPost = postExecRule({
  error: 'Access denied',
  selectionSet: '{ status author { id } }'
})(
  (
    context: Context,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) => post.status === 'public' || context.user?.id === post.author.id
);

const CanPublishPost = preExecRule()(
  async (context: Context, fieldArgs: { postId: string }) => {
    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );
    return !post || post.authorId === context.user?.id;
  }
);

const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

// Construct a schema, using GraphQL schema language
const typeDefs = `
  ${authZDirectiveTypeDefs}

  type User {
    id: ID!
    username: String!
    email: String! @authz(rules: [IsAdmin])
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
    users: [User!]! @authz(rules: [IsAuthenticated])
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    publishPost(postId: ID!): Post! @authz(rules: [CanPublishPost])
  }
`;

// resolvers
const resolvers = {
  Query: {
    users: () => users,
    posts: () => posts,
    post: (parent: unknown, args: { id: string }) =>
      posts.find(({ id }) => id === args.id)
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
    author: (parent: { authorId: string }) =>
      users.find(({ id }) => id === parent.authorId)
  },
  User: {
    posts: (parent: { id: string }) =>
      posts.filter(({ authorId }) => authorId === parent.id)
  }
};

const app = express();

// authenticate user
const authenticator: RequestHandler = (req: Request, res, next) => {
  const user = users.find(({ id }) => id === req.get('x-user-id')) || null;
  req.user = user;
  next();
};

app.use(authenticator);

app.use(
  '/',
  graphqlHTTP({
    // apply directive transformer (only needed for directive usage)
    schema: authZDirectiveTransformer(
      makeExecutableSchema({ typeDefs, resolvers })
    ),
    // providing custom execute function
    customExecuteFn: wrapExecuteFn(execute, { rules: authZRules }),
    graphiql: true
  })
);
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/');
