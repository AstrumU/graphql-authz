import { ApolloServer } from 'apollo-server';
import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import {
  UnauthorizedError,
  authZApolloPlugin,
  preExecRule,
  postExecRule
} from '@astrumu/graphql-authz';
import { IAuthConfig } from '@astrumu/graphql-authz/';

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

// authz rules
const IsAuthenticated = preExecRule({
  error: new UnauthorizedError('User is not authenticated')
})((requestContext: GraphQLRequestContext) => !!requestContext.context.user);

const IsAdmin = preExecRule({
  error: new UnauthorizedError('User is not admin')
})(
  (requestContext: GraphQLRequestContext) =>
    requestContext.context.user?.role === 'Admin'
);

const CanReadPost = postExecRule({
  error: new UnauthorizedError('Access denied'),
  selectionSet: '{ status author { id } }'
})(
  (
    requestContext: GraphQLRequestContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } }
  ) =>
    post.status === 'public' ||
    requestContext.context.user?.id === post.author.id
);

const CanPublishPost = preExecRule()(
  async (
    requestContext: GraphQLRequestContext,
    fieldArgs: { postId: string }
  ) => {
    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );
    return !post || post.authorId === requestContext.context.user?.id;
  }
);

const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

// authz extension
function createAuthZExtensions(args: IAuthConfig<typeof authZRules>) {
  return {
    authz: {
      directives: [
        {
          name: 'authz',
          arguments: args
        }
      ]
    }
  };
}

// type definitions
const Status = new GraphQLEnumType({
  name: 'Status',
  values: {
    draft: { value: 'draft' },
    public: { value: 'public' }
  }
});

const Post: GraphQLObjectType = new GraphQLObjectType({
  name: 'Post',
  extensions: createAuthZExtensions({
    rules: ['CanReadPost']
  }),
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLID) },
    title: { type: GraphQLNonNull(GraphQLString) },
    body: { type: GraphQLNonNull(GraphQLString) },
    status: { type: GraphQLNonNull(Status) },
    author: {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      type: GraphQLNonNull(User),
      resolve: (parent: { authorId: string }) =>
        users.find(({ id }) => id === parent.authorId)
    }
  })
});

const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLNonNull(GraphQLID) },
    username: { type: GraphQLNonNull(GraphQLString) },
    email: {
      type: GraphQLNonNull(GraphQLString),
      extensions: createAuthZExtensions({
        rules: ['IsAdmin']
      })
    },
    posts: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(Post))),
      resolve: (parent: { id: string }) =>
        posts.filter(({ authorId }) => authorId === parent.id)
    }
  })
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    users: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(User))),
      extensions: createAuthZExtensions({
        rules: ['IsAuthenticated']
      }),
      resolve: () => users
    },
    posts: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(Post))),
      resolve: () => posts
    },
    post: {
      type: Post,
      args: {
        id: {
          type: GraphQLNonNull(GraphQLID)
        }
      },
      resolve: (parent: unknown, args: { [argName: string]: any }) =>
        posts.find(({ id }) => id === args.id)
    }
  }
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    publishPost: {
      type: GraphQLNonNull(Post),
      extensions: createAuthZExtensions({
        rules: ['CanPublishPost']
      }),
      args: {
        postId: {
          type: GraphQLNonNull(GraphQLID)
        }
      },
      resolve: (parent: unknown, args: { [argName: string]: any }) => {
        const post = posts.find(({ id }) => id === args.postId);
        if (!post) {
          throw new Error('Not Found');
        }
        post.status = 'public';
        return post;
      }
    }
  }
});

const schema = new GraphQLSchema({
  query: Query,
  mutation: Mutation
});

const server = new ApolloServer({
  schema,
  // authz apollo plugin
  plugins: [authZApolloPlugin({ rules: authZRules })],
  context: ({ req }) => ({
    user: users.find(({ id }) => id === req.get('x-user-id')) || null
  })
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
