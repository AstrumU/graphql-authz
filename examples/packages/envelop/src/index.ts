import { createServer } from 'http';
import * as GraphQLJS from 'graphql'
import { GraphQLError } from 'graphql'
import { envelop, useExtendContext, useSchema, useEngine } from '@envelop/core';
import { makeExecutableSchema } from '@graphql-tools/schema';

import {
  preExecRule,
  postExecRule,
  directiveTypeDefs
} from '@graphql-authz/core';
import { authZEnvelopPlugin } from '@graphql-authz/envelop-plugin';
import {
  authZDirective,
  authZGraphQLDirective
} from '@graphql-authz/directive';

const { authZDirectiveTransformer } = authZDirective();

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

interface IContext {
  user?: {
    id: string;
    role: string;
  };
}

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

const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

// schema
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

const schema = authZDirectiveTransformer(
  makeExecutableSchema({
    typeDefs,
    resolvers
  })
);

const getEnveloped = envelop({
  plugins: [
    useEngine(GraphQLJS),
    useSchema(schema),
    // authenticator
    useExtendContext(context => ({
      user: users.find(({ id }) => id === context.req.headers['x-user-id']) || null
    })),
    // graphql-authz plugin
    authZEnvelopPlugin({ rules: authZRules })
  ]
});

const server = createServer((req, res) => {
  const { parse, validate, contextFactory, execute, schema } = getEnveloped({
    req
  });
  let payload = '';

  req.on('data', chunk => {
    payload += chunk.toString();
  });

  req.on('end', () => {
    const { query, variables, operationName } = JSON.parse(payload);
    const document = parse(query);
    const validationErrors = validate(schema, document);

    res.setHeader('Content-Type', 'application/json');

    if (validationErrors.length > 0) {
      res.end(
        JSON.stringify({
          errors: validationErrors
        })
      );

      return;
    }

    void (async () => {
      try {
        const context = await contextFactory(req);
        const result = await execute({
          operationName,
          document,
          schema,
          variableValues: variables,
          contextValue: context
        });

        res.end(JSON.stringify(result));
      } catch (error) {
        if (error instanceof GraphQLError) {
          res.end(JSON.stringify({ error }));
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "Unknown unexpected error!"
        res.statusCode = 500;
        res.end(JSON.stringify({ error: errorMessage }));
      }
    })();
  });
});

server.listen(4000);
