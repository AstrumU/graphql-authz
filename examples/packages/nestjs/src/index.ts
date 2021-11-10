import {
  ObjectType,
  Field,
  Args,
  ID,
  Resolver,
  Query,
  ResolveField,
  Parent,
  GraphQLModule,
  registerEnumType,
  Directive,
  Mutation
} from '@nestjs/graphql';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { preExecRule, postExecRule, IAuthConfig } from '@graphql-authz/core';
import { authZApolloPlugin } from '@graphql-authz/apollo-server-plugin';
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

// AuthZ decorator that wraps Directive decorator
function AuthZ(config: IAuthConfig<typeof authZRules>) {
  const args = (Object.keys(config) as Array<keyof typeof config>)
    .map(
      key => `${String(key)}: ${JSON.stringify(config[key]).replace(/"/g, '')}`
    )
    .join(', ');
  const directiveArgs = `(${args})`;
  return Directive(`@authz${directiveArgs}`);
}

// types
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

// resolvers
@Resolver(() => User)
class UserResolver {
  @Query(() => [User])
  @AuthZ({ rules: ['IsAuthenticated'] })
  public users() {
    return users;
  }

  @ResolveField(() => [Post])
  public posts(@Parent() parent: { id: string }) {
    return posts.filter(({ id }) => id === parent.id);
  }
}

@Resolver(() => Post)
class PostResolver {
  @Mutation(() => Post)
  @AuthZ({ rules: ['CanPublishPost'] })
  public publishPost(@Args({ name: 'postId', type: () => ID }) postId: string) {
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
  public post(@Args({ name: 'id', type: () => ID }) id: string) {
    return posts.find(post => post.id === id);
  }

  @ResolveField(() => User)
  public author(@Parent() parent: { authorId: string }) {
    return users.find(({ id }) => id === parent.authorId);
  }
}

// nestjs module
@Module({
  imports: [
    GraphQLModule.forRoot({
      path: '/',
      transformSchema: schema => authZDirectiveTransformer(schema),
      autoSchemaFile: true,
      context: ({ req }) => ({
        user: users.find(({ id }) => id === req.get('x-user-id')) || null
      }),
      // authz apollo plugin
      plugins: [authZApolloPlugin({ rules: authZRules })],
      // authz directive visitor
      buildSchemaOptions: {
        // GraphQL directive
        directives: [authZGraphQLDirective(authZRules)]
      }
    })
  ],
  providers: [UserResolver, PostResolver]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  return app.listen(4000);
}
bootstrap();
