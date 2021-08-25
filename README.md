<p align="center"><img src="https://github.com/AstrumU/graphql-authz/blob/main/img/logo.png?raw=true" width="200" /></p>

# graphql-authz

[![codecov](https://codecov.io/gh/AstrumU/graphql-authz/branch/main/graph/badge.svg?token=5IMVNTLQGF)](https://codecov.io/gh/AstrumU/graphql-authz)

### 🚧 🚧 Documentation is still in progress 🚧 🚧

## Overview

GraphQL authorization layer, flexible, (not only) directive-based, compatible with any GraphQL architecture.

## Features
- Attaching rules to Query/Mutation/Object/Interface/Field
- Attaching rules using directives, extensions or authSchema
- Pre and Post execution rules
- Any sync/async JS code inside rules
- Compatible with any GraphQL architecture

## Examples

Check examples in `examples` folder:
- [Plain Apollo Server (schema-first, directives)](examples/src/apollo-server-schema-first/index.ts)
- [Plain Apollo Server (code-first, extensions)](examples/src/apollo-server-code-first/index.ts)
- [Apollo Server with Envelop (schema-first, directives)](examples/src/envelop/index.ts)
- [TypeGraphQL (code-first, extensions)](examples/src/type-graphql/index.ts)
- [NestJS (code-first, directives)](examples/src/nestjs/index.ts)
- [Schema Stitching (gateway, directives)](examples/src/schema-stitching/)
- [Apollo Federation (gateway, authSchema)](examples/src/apollo-federation/)

## Integration

To integrate graphql-authz into project follow several steps depending on your architecture:



- [Installation](#installation)
- [Creating Rules](#creating-rules)
- [Configuring server](#configuring-server)
  - [Configuring Apollo Server plugin](#configuring-apollo-server-plugin)
  - [Configuring Envelop plugin](#configuring-envelop-plugin)
- [Configuring schema for directive usage](#configuring-schema-for-directive-usage)
  - [Schema First](#schema-first)
  - [Code First](#code-first)
- [Attaching rules](#attaching-rules)
  - [Using Directives](#using-directives)
  - [Using extensions (Code-First only)](#using-extensions-code-first-only)
  - [Using AuthSchema](#using-authschema)

Read more
- [Pre execution rules vs Post execution rules](#pre-execution-rules-vs-post-execution-rules)  
- [Composing rules](#composing-rules)
- [Custom errors](#custom-errors)





## Installation

`yarn add graphql-authz`

## Creating Rules

Create rule and `rules` object
```ts
import { preExecRule } from "@graphql-authz/core";

const IsAuthenticated = preExecRule()(context => !!context.user);

const rules = {
  IsAuthenticated
} as const;
```

Alternatively you can create rule as a class
  ```ts
  import { PreExecutionRule } from "@graphql-authz/core";

  class IsAuthenticated extends PreExecutionRule {
    public execute(context) {
      if (!context.user) {
        throw this.error;
      }
    }
  }

  const rules = {
    IsAuthenticated
  } as const;
  ```

## Configuring server

Ensure context parser is configured to perform authentication and add user info to context
  ```ts
    ...
    context: ({ req }) => {
      return {
        user: someHowAuthenticateUser(req.get("authorization"))),
      };
    },
    ...
  ```

### [Configuring Apollo Server plugin](/packages/plugins/apollo-server/README.md)

### [Configuring Envelop plugin](/packages/plugins/envelop/README.md)



## Configuring schema for directive usage

### Schema First 
Add rules and directive definition to the schema
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
Alternatively generate rules and directive definition
  ```ts
  import { directiveTypeDefs } from "@graphql-authz/core";
  import { authZGraphQLDirective } from "@graphql-authz/directive";

  const directive = authZGraphQLDirective(rules);
  const authZDirectiveTypeDefs = directiveTypeDefs(directive);

  const typeDefs = gql`
    ${authZDirectiveTypeDefs}

    ...

  `;
  ```

### Code First
Pass directive to schema options to generate rules and directive definition
  ```ts
  import { authZGraphQLDirective } from "@graphql-authz/directive";

  new GraphQLSchema({
    ...
    directives: [authZGraphQLDirective(rules)]
    ...
  });
  ```

## Attaching rules

### Using Directives

Add authz directive to Query/Mutation/Object/Interface/Field you need to perform authorization on

**Schema-First**

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

**Code-First** using decorators
```ts
@InterfaceType()
@Directive(`@authz(rules: [Rule01]`)
class TestInterface {
  @Field()
  @Directive(`@authz(rules: [Rule02])`)
  public testField1!: string;
}

@ObjectType({ implements: TestInterface })
@Directive(`@authz(rules: [Rule01])`)
class TestType {
  @Field()
  public testField1!: string;

  @Field()
  @Directive(`@authz(rules: [Rule02])`)
  public testField2!: number;
}

@Resolver()
class ResolverClass {

  @Query(() => TestType)
  @Directive(`@authz(rules: [Rule01, Rule02])`)
  public testQuery() {
    ...
  }

  @Mutation(() => TestType)
  @Directive(`@authz(rules: [Rule01, Rule02])`)
  public testMutation() {
    ...
  }
}
```
Alternatively custom decorator-wrapper can be used
```ts
import { IAuthConfig } from "@graphql-authz/core";

function AuthZ(config: IAuthConfig<typeof rules>) {
  const args = Object.keys(config)
    .map(
      key => `${key}: ${JSON.stringify(config[key]).replace(/"/g, '')}`
    )
    .join(', ');
  const directiveArgs = `(${args})`;
  return Directive(`@authz${directiveArgs}`);
}

@InterfaceType()
@AuthZ({ rules: ['Rule01'] })
class TestInterface {
  @Field()
  @AuthZ({ rules: ['Rule02'] })
  public testField1!: string;
}

```

### Using extensions (Code-First only)

using decorators looks pretty similar to the directive usage with decorators
```ts
import { IAuthConfig } from "@graphql-authz/core";

function AuthZ(args: IAuthConfig<typeof rules>) {
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

@InterfaceType()
@AuthZ({ rules: ['Rule01'] })
class TestInterface {
  @Field()
  @AuthZ({ rules: ['Rule02'] })
  public testField1!: string;
}
```
using graphql.js constructors
```ts
import { IAuthConfig } from "@graphql-authz/core";

function createAuthZExtensions(args: IAuthConfig<typeof rules>) {
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

const Post = new GraphQLObjectType({
  name: 'Post',
  extensions: createAuthZExtensions({
    rules: ['CanReadPost']
  }),
  fields: () => ({
    ...
  })
});

const Query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    post: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(Post))),
      extensions: createAuthZExtensions({
        rules: ['IsAuthenticated']
      }),
      ...
    }
  }
});
```

### Using AuthSchema

  ```ts
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
  ```
## Pre execution rules vs Post execution rules

**Pre execution rules** are executed ***before*** any resolvers are called and have `context` and `fieldArgs` as arguments.

`context` is GraphQL context

`fieldArgs` is object that has all arguments passed to `Query`/`Mutation`/`Field` the rule is applied to. If the rule is applied to `ObjectType` or `InterfaceType` then `fieldArgs` is an empty object.

If no other data is needed to perform authorization (e.g. actual data from the database or actual response to the request) then Pre execution rule should be used.

To create simple Pre execution rule `preExecRule` function should be used
```ts
import { preExecRule } from "@graphql-authz/core";

const IsAuthenticated = preExecRule()(context => !!context.user);
  ```

Alternatively new class extended from `PreExecutionRule` could be created

```ts
import { PreExecutionRule } from "@graphql-authz/core";

class IsAuthenticated extends PreExecutionRule {
  public execute(context) {
    if (!context.user) {
      throw this.error;
    }
  }
}
```

**Post execution rules** are executed ***after*** all of resolvers logic is executed and result response is ready. Because of that fact, Post execution rules have access to the actual result of query execution. This can resolve authorization cases when the decision depends on attributes of the requested entity, for example, if only the author of the post can see the post if it is in draft status.

In order to create Post execution rule `postExecRule` function should be used
```ts
const CanReadPost = postExecRule({
  selectionSet: '{ status author { id } }'
})(
  (
    context: IContext,
    fieldArgs: unknown,
    post: { status: string; author: { id: string } },
    parent: unknown
  ) =>
    post.status === 'public' || context.user?.id === post.author.id
);
```

Alternatively new class extended from `PostExecutionRule` could be created

```ts
class CanReadPost extends PostExecutionRule {
  public execute(
    context: IContext,
    fieldArgs: any,
    post: Post,
    parent: unknown
  ) {
    if (post.status !== "public" && context.user?.id !== post.author.id) {
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
const CanPublishPost = preExecRule()(
  async (
    context: IContext,
    fieldArgs: { postId: string }
  ) => {
    const post = await db.posts.get(fieldArgs.postId);
    if (post.authorId !== context.user?.id) {
      throw this.error;
    }
  }
);
```

### Alternative by querying schema itself inside rules

graphql-authz doesn't mutate executable schema so you can query schema itself right inside Pre execution rule

**Note:** you need to pass schema to context to access it inside rules

```ts
const CanPublishPost = preExecRule()(
  async (
    context: IContext,
    fieldArgs: { postId: string }
  ) => {
    // query executable schema from rules
    const graphQLResult = await graphql({
      schema: context.schema,
      source: `query post { post(id: ${fieldArgs.postId}) { author { id } } }`
    });

    const post = graphQLResult.data?.post;

    return post && post.author.id === context.user?.id;
  }
);
```

## Composing rules

### Default composition

Rules that are passed to `@authz` directive as `rules` list are composing with AND logical operator. So `@authz(rules: [Rule01, Rule02])` means that authorization will be passed only if `Rule01` AND `Rule02` didn't throw any error.

### Create composition rules

To create different composition rules new class extended from `AndRule`, `OrRule` or `NotRule` should be created

```ts
import {
  AndRule,
  OrRule,
  NotRule
} from "@graphql-authz/core";

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

Rules can be composed in an inline way by using `compositeRules` and `deepCompositeRules` parameters. The difference between them is `compositeRules` supports only one level of inline composing. `deepCompositeRules` supports any levels of composing but it requires `id` key for the existing rule identificator.

Inline rules composition works with directives, extensions and authSchema

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

```ts
const authSchema = {
  User: {
    __authz: {
      compositeRules: [{
        or: ['Rule01', 'Rule03'],
        not: ['Rule02']
      }]
    }
  },
  Post: {
    body: {
      __authz: {
        deepCompositeRules: [{
          or: [
            {
              and: [{ id: 'Rule01' }, { id: 'Rule02' }]
            },
            {
              or: [{ id: 'Rule03' }, { id: 'Rule04' }]
            }
          ]
        }]
      }
    }
  }
}
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
