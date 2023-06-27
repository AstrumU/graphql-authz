import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { preExecRule, postExecRule, IAuthConfig } from '@graphql-authz/core';
import { authZApolloPlugin } from '@graphql-authz/apollo-server-plugin';

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

interface IContext {
  user?: {
    id: string;
    role: string;
  };
}

// authz rules
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
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    body: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(Status) },
    author: {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      type: new GraphQLNonNull(User),
      resolve: (parent: { authorId: string }) =>
        users.find(({ id }) => id === parent.authorId)
    }
  })
});

const User = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
    email: {
      type: new GraphQLNonNull(GraphQLString),
      extensions: createAuthZExtensions({
        rules: ['IsAdmin']
      })
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
      resolve: (parent: { id: string }) =>
        posts.filter(({ authorId }) => authorId === parent.id)
    }
  })
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    users: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(User))),
      extensions: createAuthZExtensions({
        rules: ['IsAuthenticated']
      }),
      resolve: () => users
    },
    posts: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
      resolve: () => posts
    },
    post: {
      type: Post,
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLID)
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
      type: new GraphQLNonNull(Post),
      extensions: createAuthZExtensions({
        rules: ['CanPublishPost']
      }),
      args: {
        postId: {
          type: new GraphQLNonNull(GraphQLID)
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
  plugins: [authZApolloPlugin({ rules: authZRules })]
});

startStandaloneServer(server, {
  context: async ({ req }) => ({
    user: users.find(({ id }) => id === req.headers['x-user-id']) || null
  })
}).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
