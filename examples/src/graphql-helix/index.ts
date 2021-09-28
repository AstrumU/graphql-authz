import express from 'express';
import { execute } from 'graphql';
import {
  getGraphQLParameters,
  processRequest,
  renderGraphiQL,
  shouldRenderGraphiQL,
  sendResult
} from 'graphql-helix';

import { postExecRule, preExecRule, wrapExecuteFn } from '@graphql-authz/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

interface IContext {
  user?: {
    id: string;
    role: string;
  };
}

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
})((context: IContext) => !!context.user);

const IsAdmin = preExecRule({
  error: 'User is not admin'
})((context: IContext) => context.user?.role === 'Admin');

const CanReadPost = postExecRule({
  error: 'Access denied',
  selectionSet: '{ status author { id } }'
})(
  (
    context: IContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) => post.status === 'public' || context.user?.id === post.author.id
);

const CanPublishPost = preExecRule()(
  async (context: IContext, fieldArgs: { postId: string }) => {
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

// Construct a schema, using GraphQL schema language
const typeDefs = `
  type User {
    id: ID!
    username: String!
    email: String!
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

  type Query {
    users: [User!]!
    posts: [Post!]!
    post(id: ID!): Post
  }

  type Mutation {
    publishPost(postId: ID!): Post!
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

// auth schema is used in this example. please see other examples
// to get reference for directive or extensions usage
const authSchema = {
  Post: { __authz: { rules: ['CanReadPost'] } },
  User: {
    email: { __authz: { rules: ['IsAdmin'] } }
  },
  Mutation: {
    publishPost: { __authz: { rules: ['CanPublishPost'] } }
  },
  Query: {
    users: { __authz: { rules: ['IsAuthenticated'] } }
  }
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

app.use(express.json());

app.use('/', async (req, res) => {
  const request = {
    body: req.body,
    headers: req.headers,
    method: req.method,
    query: req.query
  };

  if (shouldRenderGraphiQL(request)) {
    res.send(renderGraphiQL());
  } else {
    const { operationName, query, variables } = getGraphQLParameters(request);

    const result = await processRequest({
      operationName,
      query,
      variables,
      request,
      schema,
      // authenticate user
      contextFactory: () => ({
        user: users.find(({ id }) => id === req.get('x-user-id')) || null
      }),
      // custom executor
      execute: wrapExecuteFn(execute, { rules: authZRules, authSchema })
    });

    sendResult(result, res);
  }
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`GraphQL server is running on port ${port}.`);
});
