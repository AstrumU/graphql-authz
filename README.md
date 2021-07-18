<p align="center"><img src="https://github.com/AstrumU/graphql-authz/blob/main/img/logo.png?raw=true" width="200" /></p>

# graphql-authz

## Overview

GraphQL authorization layer, flexible, directive-based, compatible with any GraphQL architecture based on apollo-server.

## Example

### Apollo-server

```ts
import { ApolloServer, gql } from 'apollo-server';
import { GraphQLRequestContext } from 'apollo-server-plugin-base';
import {
  UnauthorizedError,
  PreExecutionRule,
  PostExecutionRule,
  authZApolloPlugin
} from '@astrumu/graphql-authz';

const typeDefs = gql`
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
  }
};

class IsAuthenticated extends PreExecutionRule {
  public error = new UnauthorizedError('User is not authenticated');

  public execute(requestContext: GraphQLRequestContext) {
    if (!requestContext.context.user) {
      throw this.error;
    }
  }
}

class IsAdmin extends PreExecutionRule {
  public error = new UnauthorizedError('User is not admin');

  public execute(requestContext: GraphQLRequestContext) {
    if (requestContext.context.user?.role !== 'Admin') {
      throw this.error;
    }
  }
}

class CanReadPost extends PostExecutionRule {
  public error = new UnauthorizedError('Access denied');

  public execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } },
    parent: unknown
  ) {
    if (
      post.status !== 'public' &&
      requestContext.context.user?.id !== post.author.id
    ) {
      throw this.error;
    }
  }

  public selectionSet = '{ status author { id } }';
}

class CanPublishPost extends PreExecutionRule {
  public async execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: { postId: string }
  ) {
    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );
    if (post && post.authorId !== requestContext.context.user?.id) {
      throw this.error;
    }
  }
}

const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  plugins: [authZApolloPlugin(authZRules)],
  context: ({ req }) => ({
    user: users.find(({ id }) => id === req.get('x-user-id')) || null
  })
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});

```

### Code-first with NestJS

```ts
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
  PreExecutionRule,
  PostExecutionRule,
  authZApolloPlugin,
  authZDirective,
  AuthZDirective
} from '@astrumu/graphql-authz';

function AuthZ(config: Record<string, unknown>) {
  const args = Object.keys(config)
    .map(key => `${key}: ${JSON.stringify(config[key]).replace(/"/g, '')}`)
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

class IsAuthenticated extends PreExecutionRule {
  public error = new UnauthorizedError('User is not authenticated');

  public execute(requestContext: GraphQLRequestContext) {
    if (!requestContext.context.user) {
      throw this.error;
    }
  }
}

class IsAdmin extends PreExecutionRule {
  public error = new UnauthorizedError('User is not an admin');

  public execute(requestContext: GraphQLRequestContext) {
    if (requestContext.context.user?.role !== 'Admin') {
      throw this.error;
    }
  }
}

class CanReadPost extends PostExecutionRule {
  public error = new UnauthorizedError('Access denied');

  public execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: unknown,
    value: { status: string; author: { id: string } }
  ) {
    if (
      value.status !== 'public' &&
      requestContext.context.user?.id !== value.author.id
    ) {
      throw this.error;
    }
  }

  public selectionSet = '{ status author { id } }';
}

class CanPublishPost extends PreExecutionRule {
  public async execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: { postId: string }
  ) {
    const post = await Promise.resolve(
      posts.find(({ id }) => id === fieldArgs.postId)
    );
    if (post && post.authorId !== requestContext.context.user?.id) {
      throw this.error;
    }
  }
}

const authZRules = {
  IsAuthenticated,
  IsAdmin,
  CanReadPost,
  CanPublishPost
} as const;

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: true,
      context: ({ req }) => ({
        user: users.find(({ id }) => id === req.get('x-user-id')) || null
      }),
      plugins: [authZApolloPlugin(authZRules)],
      schemaDirectives: { authz: AuthZDirective },
      buildSchemaOptions: {
        directives: [authZDirective(authZRules)]
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
```

## Features

- Pre and Post execution rules
- Attaching rules to Query/Mutation/Object/Interface/Field
- Any sync/async JS code inside rules
- Compatible with any GraphQL architecture based on apollo-server (monolith, microservice or microservice federation architecture such as https://www.apollographql.com/docs/federation/, https://www.graphql-tools.com/docs/schema-stitching/)

## Integration

To integrate graphql-authz into project follow few simple steps:

- `yarn add graphql-authz`
- Create rule and `rules` object
  ```ts
  import { GraphQLRequestContext } from "apollo-server-plugin-base";
  import { PreExecutionRule } from "graphql-authz";

  class IsAuthenticated extends PreExecutionRule {
    public execute(requestContext: GraphQLRequestContext) {
      if (!requestContext.context.user) {
        throw this.error;
      }
    }
  }

  const rules = {
    IsAuthenticated
  } as const;
  ```
- Add plugin to apollo-server
  ```ts
    import { authZApolloPlugin } from "graphql-authz";

    const server = new ApolloServer({
      ...
      plugins: [authZApolloPlugin(rules)],
      ...
    });
  ```
- **Schema First**: Add rules and directive definition to the schema
  ```ts
    # this is custom list of your rules
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
  ```
- **Code First**: Pass directive to schema options to generate part of schema mentioned above
  ```ts
    import { authZDirective } from "graphql-authz";

    new GraphQLSchema({
      ...
      directives: [authZDirective(rules)]
      ...
    });
  ```
- Ensure context parser is configured to perform authentication and add user info to context
  ```ts
  const server = new ApolloServer({
    ...
    context: ({ req }) => {
      return {
        user: someHowAuthenticateUser(req.get("authorization"))),
      };
    },
    ...
  });
  ```

### That's it!

Now authz directive can be used in schema

## Usage

Add authz directive to Query/Mutation/Object/Interface/Field you need to perform authorization on:

```ts
interface TestInterface @authz(rules: [Rule01]) {
  testField1: String! @authz(rules: [Rule02])
}

type TestType implements TestInterface @authz(rules: [Rule01]) {
  testField1: String!
  testField2: Float! @authz(rules: [Rule02])
}

type Query {
  testQuery: TestType! @authz(rules: [Rule01, Rule02])
}

type Mutation {
  testMutation: TestType! @authz(rules: [Rule01, Rule02])
}
```

## Pre execution rules vs Post execution rules

**Pre execution rules** are executed ***before*** any resolvers are called and have `GraphQLRequestContext` and `fieldArgs` as arguments.

`GraphQLRequestContext` object has `request`, `response`, `context` and other data: https://github.com/apollographql/apollo-server/blob/main/packages/apollo-server-types/src/index.ts#L115-L150

`fieldArgs` is object that has all arguments passed to `Query`/`Mutation`/`Field` the rule is applied to. If the rule is applied to `ObjectType` or `InterfaceType` then `fieldArgs` is an empty object.

If no other data is needed to perform authorization (e.g. actual data from the database or actual response to the request) then Pre execution rule should be used.

To create Pre execution rule new class extended from `PreExecutionRule` should be created

```ts
import { GraphQLRequestContext } from "apollo-server-plugin-base";
import { PreExecutionRule } from "graphql-authz";

class IsAuthenticated extends PreExecutionRule {
  public execute(requestContext: GraphQLRequestContext, fieldArgs: any) {
    if (!requestContext.context.user) {
      throw this.error;
    }
  }
}
```

**Post execution rules** are executed ***after*** all of resolvers logic is executed and result response is ready. Because of that fact, Post execution rules have access to the actual result of query execution. This can resolve authorization cases when the decision depends on attributes of the requested entity, for example, if only the author of the post can see the post if it is in draft status.

In order to create Post execution rule, new class extended from `PostExecutionRule` should be created

```ts
class CanReadPost extends PostExecutionRule {
  public execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: any,
    post: Post,
    parent: unknown
  ) {
    if (
      post.status !== "public" &&
      requestContext.context.user?.id !== post.author.id
    ) {
      throw this.error;
    }
  }

  public selectionSet = "{ status author { id } }";
}
```

By adding `selectionSet` field we ensure that even if the client originally didn't request fields that are needed to perform authorization these fields are present in the result value that comes to rule as an argument.

**Please note** that with Post execution rules resolvers are executed even if the rule throws an Unauthorized error, so such rules are not suitable for Mutations or Queries that update some counters (count of views for example)

### Alternative by querying DB inside rules

All rules can be async so for cases where authorization depends on real data and should be performed strictly before resolvers execution (for Mutation or Queries that update some counters) you can query DB right inside Pre execution rule

```ts
class CanPublishPost extends PreExecutionRule {
  public async execute(
    requestContext: GraphQLRequestContext,
    fieldArgs: { postId: string }
  ) {
    const post = await db.posts.get(fieldArgs.postId);
    if (post.authorId !== requestContext.context.user?.id) {
      throw this.error;
    }
  }
}
```

## Compositing rules

### Default composition

Rules that are passed to `@authz` directive as `rules` list are composing with AND logical operator. So `@authz(rules: [Rule01, Rule02])` means that authorization will be passed only if `Rule01` AND `Rule02` didn't throw any error.

### Create composition rules

To create different composition rules new class extended from `AndRule`, `OrRule` or `NotRule` should be created

```ts
import {
  AndRule,
  OrRule,
  NotRule
} from '@astrumu/graphql-authz';

class TestAndRule extends AndRule {
  public getRules() {
    return [Rule01, Rule02, Rule03];
  }
}

class TestOrRule extends OrRule {
  public getRules() {
    return [Rule01, Rule02, Rule03];
  }
}

class TestNotRule extends NotRule {
  public getRules() {
    return [Rule01, Rule02, Rule03];
  }
}
```

With such code

`TestAndRule` will pass only if all of `Rule01`, `Rule02`, `Rule03` not throw error

`TestOrRule` will pass if any of `Rule01`, `Rule02`, `Rule03` not throw an error

`TestNotRule` will pass only if every of `Rule01`, `Rule02`, `Rule03` throw error

Composition rules can be used just like regular rules

```ts
@authz(rules: [TestAndRule])
@authz(rules: [TestOrRule])
@authz(rules: [TestNotRule])
```

Also, composite rules can be composed of other composite rules

```ts
class TestOrRule02 extends OrRule {
  public getRules() {
    return [TestAndRule, TestOrRule, TestNotRule];
  }
}
```

### Inline composition rules

Rules can be composed in an inline way by using `compositeRules` and `deepCompositeRules` arguments of the directive. The difference between them is `compositeRules` supports only one level of inline composing. `deepCompositeRules` supports any levels of composing but it requires `id` key for the existing rule identificator.

```ts
@authz(compositeRules: [{
  or: [Rule01, Rule03],
  not: [Rule02]
}])

@authz(deepCompositeRules: [{
  or: [
    {
      and: [{ id: Rule01 }, { id: Rule02 }]
    },
    {
      or: [{ id: Rule03 }, { id: Rule04 }]
    }
  ]
}])
```

Pre and Post execution rules can be mixed in any way inside all types of composite rules.

## Custom errors

To provide custom error for rule the `error` field should be provided to the rule class.

```ts
import { UnauthorizedError } from 'graphql-authz';

class SomeRule extends PreExecutionRule {
  public error = new UnauthorizedError("User is not authenticated");
  public execute() {
    throw this.error;
  }
}
```

It's important to throw an instance of `UnauthorizedError` imported from `graphql-authz` to enable composite rules to correctly handle errors thrown from rules. If an instance of `UnauthorizedError` is thrown it's treated as a certain rule didn't pass. If the rule is wrapped with `NotRule` then execution should continue. Any other errors are treated as runtime errors and are thrown up, so if any other error is thrown from the rule that is wrapped with `NotRule` it will fail the entire request.

## How it works

On a top level, this library is just an apollo-server plugin that wraps the request-response cycle. Before execution of resolvers, it calculates what rules should be executed for the current request, instantiates needed rules, and adds necessary selection sets for Post execution rules. Then it executes Pre execution rules. Then resolvers are executed. Then Post execution rules are executed with the result of resolvers execution passed as an argument. If some rule throws an error in any stage of the request-response cycle, an Unauthorized error is thrown unless the rule is wrapped with a composite rule and it shouldn't fail the request at all (for `Not` composite rule) or it shouldn't fail the request immediately (for `Or` composite rule where at least one of rules in a set should not throw an error)
