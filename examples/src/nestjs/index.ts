import { GraphQLRequestContext } from 'apollo-server-plugin-base';
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

import {
  UnauthorizedError,
  authZApolloPlugin,
  authZGraphQLDirective,
  AuthZDirectiveVisitor,
  preExecRule,
  postExecRule,
  IExtensionsDirectiveArguments
} from '@astrumu/graphql-authz';

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

function AuthZ(config: IExtensionsDirectiveArguments<typeof authZRules>) {
  const args = (Object.keys(config) as Array<keyof typeof config>)
    .map(
      key => `${String(key)}: ${JSON.stringify(config[key]).replace(/"/g, '')}`
    )
    .join(', ');
  const directiveArgs = `(${args})`;
  return Directive(`@authz${directiveArgs}`);
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

@Resolver(() => User)
class UserResolver {
  @Query(() => [User])
  @AuthZ({ rules: ['IsAuthenticated'] })
  public users() {
    return users;
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

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      context: ({ req }) => ({
        user: users.find(({ id }) => id === req.get('x-user-id')) || null
      }),
      plugins: [authZApolloPlugin(authZRules)],
      schemaDirectives: { authz: AuthZDirectiveVisitor },
      buildSchemaOptions: {
        directives: [authZGraphQLDirective(authZRules)]
      }
    })
  ],
  providers: [UserResolver, PostResolver]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  return app.listen(4001);
}
bootstrap();
