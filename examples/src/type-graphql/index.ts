import 'reflect-metadata';
import { ApolloServer } from 'apollo-server';
import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import {
  ObjectType,
  Field,
  Arg,
  ID,
  Resolver,
  Query,
  FieldResolver,
  Root,
  registerEnumType,
  Extensions,
  Mutation,
  buildSchema
} from 'type-graphql';
import {
  UnauthorizedError,
  authZApolloPlugin,
  preExecRule,
  postExecRule,
  IAuthConfig
} from '@astrumu/graphql-authz';

function AuthZ(args: IAuthConfig<typeof authZRules>) {
  return Extensions({
    authz: {
      directives: [
        {
          name: 'authz',
          arguments: args
        }
      ]
    }
  });
}

@ObjectType()
class User {
  @Field(() => ID)
  public id!: string;

  @Field()
  public username!: string;

  @Field()
  @AuthZ({ rules: ['IsAdmin'] })
  public email!: string;

  @Field(() => [Post])
  public posts!: Post[];
}

enum Status {
  draft = 'draft',
  public = 'public'
}

registerEnumType(Status, { name: 'Status' });

@ObjectType()
@AuthZ({ rules: ['CanReadPost'] })
class Post {
  @Field(() => ID)
  public id!: string;

  @Field()
  public title!: string;

  @Field()
  public body!: string;

  @Field(() => Status)
  public status!: Status;

  @Field(() => User)
  public author!: User;
}

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

@Resolver(() => User)
class UserResolver {
  @Query(() => [User])
  @AuthZ({ rules: ['IsAuthenticated'] })
  public users() {
    return users;
  }

  @FieldResolver(() => [Post])
  public posts(@Root() parent: { id: string }) {
    return posts.filter(({ authorId }) => parent.id === authorId);
  }
}

@Resolver(() => Post)
class PostResolver {
  @Mutation(() => Post)
  @AuthZ({ rules: ['CanPublishPost'] })
  public publishPost(@Arg('postId', () => ID) postId: string) {
    const post = posts.find(({ id }) => id === postId);
    if (!post) {
      throw new Error('Not Found');
    }
    post.status = 'public';
    return post;
  }

  @Query(() => [Post])
  public posts() {
    return posts;
  }

  @Query(() => Post)
  public post(@Arg('id', () => ID) id: string) {
    return posts.find(post => post.id === id);
  }

  @FieldResolver(() => User)
  public author(@Root() parent: { authorId: string }) {
    return users.find(({ id }) => id === parent.authorId);
  }
}

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

async function bootstrap() {
  const schema = await buildSchema({
    resolvers: [PostResolver, UserResolver]
  });

  const server = new ApolloServer({
    schema,
    plugins: [authZApolloPlugin({ rules: authZRules })],
    context: ({ req }) => ({
      user: users.find(({ id }) => id === req.get('x-user-id')) || null
    }),
    playground: true
  });

  return server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}
bootstrap();
