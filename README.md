<p align="center"><img src="./img/graphql-authz-gh-cover.png" height="250px" /></p>

# 

<p align="center">GraphQL authorization layer, flexible, (not only) directive-based, compatible with all modern GraphQL architectures.</p>

<p align="center">
  <a href="https://codecov.io/gh/AstrumU/graphql-authz"><img src="https://codecov.io/gh/AstrumU/graphql-authz/branch/main/graph/badge.svg?token=5IMVNTLQGF" height="20"/></a>
  <a href="."><img src="https://badgen.net/github/checks/AstrumU/graphql-authz/main" height="20"/></a>
  <a href="http://www.typescriptlang.org/"><img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" height="20"/></a>
  <a href="https://www.npmjs.com/package/@graphql-authz/core"><img src="https://badgen.net/npm/v/@graphql-authz/core" height="20"/></a>
  <a href="https://www.npmjs.com/package/@graphql-authz/core"><img src="https://badgen.net/npm/types/@graphql-authz/core" height="20"/></a>
</p>


## Overview

Flexible modern way of adding an authorization layer on top of your existing GraphQL microservices or monolith backend systems.

Full overview can be found in this blog post: [https://the-guild.dev/blog/graphql-authz](https://the-guild.dev/blog/graphql-authz)

## Features
- Attaching rules to Query/Mutation/Object/Interface/Field
- Attaching rules using directives, extensions or authSchema
- Pre and Post execution rules
- Any sync/async JS code inside rules
- Compatible with all modern GraphQL architectures

## Examples

Check examples in `examples` folder:
- [Apollo Server (schema-first, directives)](examples/packages/apollo-server-schema-first)
- [Apollo Server (code-first, extensions)](examples/packages/apollo-server-code-first)
- [express-graphql (schema-first, directives)](examples/packages/express-graphql)
- [GraphQL Helix (schema-first, authSchema)](examples/packages/graphql-helix)
- [Envelop (schema-first, directives)](examples/packages/envelop)
- [TypeGraphQL (code-first, extensions)](examples/packages/type-graphql)
- [NestJS (code-first, directives)](examples/packages/nestjs)
- [Schema Stitching (gateway, directives)](examples/packages/schema-stitching)
- [Apollo Federation (gateway, authSchema)](examples/packages/apollo-federation)

## Integration

To integrate graphql-authz into the project you can follow several steps depending on your architecture:



- [Installation](#installation)
- [Creating Rules](#creating-rules)
- [Configuring server](#configuring-server)
  - [Configuring Apollo Server plugin](#configuring-apollo-server-plugin)
  - [Configuring Envelop plugin](#configuring-envelop-plugin)
  - [Configuring express-graphql](#configuring-express-graphql)
  - [Configuring graphql-helix](#configuring-graphql-helix)
- [Configuring schema for directive usage](#configuring-schema-for-directive-usage)
  - [Schema First](#schema-first)
  - [Code First](#code-first)
- [Attaching rules](#attaching-rules)
  - [Using Directives](#using-directives)
  - [Using extensions (Code-First only)](#using-extensions-code-first-only)
  - [Using AuthSchema](#using-authschema)

Read more
- [Pre execution rules vs Post execution rules](#pre-execution-rules-vs-post-execution-rules)  
- [Wildcard rules](#wildcard-rules)
- [Composing rules](#composing-rules)
- [Custom errors](#custom-errors)





## Installation

`yarn add @graphql-authz/core`

## Creating Rules

Create rule and `rules` object
```ts
import { preExecRule } from "@graphql-authz/core";

const IsAuthenticated = preExecRule()(context => !!context.user);

const rules = {
  IsAuthenticated
} as const;
```

Alternatively you can create a rule as a class
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

<details>
  <summary>
    <strong id="configuring-apollo-server-plugin">Configuring Apollo Server plugin</strong>
  </summary>

  See [Apollo Server plugin readme](packages/plugins/apollo-server/README.md)
  or check examples:

  [Apollo Server (schema-first, directives)](examples/packages/apollo-server-schema-first)

  [Apollo Server (code-first, extensions)](examples/packages/apollo-server-code-first)

</details>
<br>

<details>
  <summary>
    <strong id="configuring-envelop-plugin">Configuring Envelop plugin</strong>
  </summary>

  See [Envelop plugin readme](packages/plugins/envelop/README.md) or check examples:
  
  [Envelop (schema-first, directives)](examples/packages/envelop)
</details>
<br>

<details>
  <summary>
    <strong id="configuring-express-graphql">Configuring express-graphql</strong>
  </summary>

  Ensure authenticator is configured to add user info to the request object
  ```ts
  const authenticator = (req, res, next) => {
    const user = someHowAuthenticateUser(req.get("authorization")));
    req.user = user;
    next();
  };
  
  app.use(authenticator);
  ```
  
  Provide `customExecuteFn` to `graphqlHTTP`
  ```ts
  import { execute } from 'graphql';
  import { graphqlHTTP } from 'express-graphql';
  import { wrapExecuteFn } from '@graphql-authz/core';
  
  graphqlHTTP({
    ...
    customExecuteFn: wrapExecuteFn(execute, { rules }),
    ...
  })
  ```
  
  ### For Directives usage
  
  Apply directive transformer to schema
  ```ts
  import { authZDirective } from '@graphql-authz/directive';
  
  const { authZDirectiveTransformer } = authZDirective();
  
  graphqlHTTP({
      ...
      schema: authZDirectiveTransformer(schema),
      customExecuteFn: wrapExecuteFn(execute, { rules }),
      ...
    })
  ```
  
  ### For AuthSchema usage
  
  Pass additional parameter `authSchema` to `wrapExecuteFn`
  ```ts
  import { execute } from 'graphql';
  import { wrapExecuteFn } from '@graphql-authz/core';
  
  graphqlHTTP({
    ...
    customExecuteFn: wrapExecuteFn(execute, { rules: authZRules, authSchema }),
    ...
  })
  ```
  
  
  Check an example: [express-graphql (schema-first, directives)](examples/packages/express-graphql)

</details>
<br>

<details>
  <summary>
    <strong id="configuring-graphql-helix">Configuring GraphQL Helix</strong>
  </summary>

  Ensure context parser is configured to perform authentication and add user info to context
  ```ts
  import { processRequest } from 'graphql-helix';
  
  processRequest({
    ...
    contextFactory: () => ({
      user: someHowAuthenticateUser(req.get("authorization")))
    }),
    ...
  })
  ```
  
  Provide `execute` option to `processRequest`
  ```ts
  import { execute } from 'graphql';
  import { processRequest } from 'graphql-helix';
  import { wrapExecuteFn } from '@graphql-authz/core';
  
  processRequest({
    ...
    execute: wrapExecuteFn(execute, { rules })
    ...
  })
  ```
  
  ### For Directives usage
  
  Apply directive transformer to schema
  ```ts
  import { authZDirective } from '@graphql-authz/directive';
  
  const { authZDirectiveTransformer } = authZDirective();
  
  processRequest({
      ...
      schema: authZDirectiveTransformer(schema),
      execute: wrapExecuteFn(execute, { rules }),
      ...
    })
  ```
  
  ### For AuthSchema usage
  
  Pass additional parameter `authSchema` to `wrapExecuteFn`
  ```ts
  import { execute } from 'graphql';
  import { processRequest } from 'graphql-helix';
  import { wrapExecuteFn } from '@graphql-authz/core';
  
  processRequest({
    ...
    execute: wrapExecuteFn(execute, { rules, authSchema })
    ...
  })
  ```
  
  Check an example: [GraphQL Helix (schema-first, authSchema)](examples/packages/graphql-helix)
</details>
<br>

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

Using decorators looks pretty similar to the directive usage with decorators
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
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(Post))),
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

`fieldArgs` is an object that has all arguments passed to `Query`/`Mutation`/`Field` the rule is applied to. If the rule is applied to `ObjectType` or `InterfaceType` then `fieldArgs` is an empty object.

If no other data is needed to perform authorization (e.g. actual data from the database or actual response to the request) then the Pre execution rule should be used.

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

**Post execution rules** are executed ***after*** all resolvers logic is executed and the result response is ready. Because of that fact, Post execution rules have access to the actual result of query execution. This can resolve authorization cases when the decision depends on attributes of the requested entity, for example, if only the author of the post can see the post if it is in draft status.

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

Alternatively a new class extended from `PostExecutionRule` could be created

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

By adding `selectionSet` we ensure that even if the client originally didn't request fields that are needed to perform authorization these fields are present in the result value that comes to a rule as an argument.

**Please note** that with post execution rules resolvers are executed even if the rule throws an unauthorized error, so such rules are not suitable for Mutations or Queries that update some counters (count of views for example)

### Alternative by querying DB inside rules

All rules can be async so for cases where authorization depends on real data and should be performed strictly before resolvers execution (for Mutation or Queries that update some counters) you can query DB right inside pre execution rule

```ts
const CanPublishPost = preExecRule()(
  async (
    context: IContext,
    fieldArgs: { postId: string }
  ) => {
    const post = await db.posts.get(fieldArgs.postId);
    return post.authorId === context.user?.id;
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

## Wildcard rules

Attaching rules using wildcards is supported by authSchema. Wildcard can be used as a name of Object and as a name of field in different combinations. Here are some examples:

```ts
  // Reject rule is attached to every Object
  const authSchema = {
    '*': { __authz: { rules: ['Reject'] } }
  };
```

```ts
  // Reject rule is attached to every Field of every Object
  const authSchema = {
    '*': {
      '*': { __authz: { rules: ['Reject'] } }
    }
  };
```

```ts
  // Reject rule is attached to every Object AND every Field of every Object
  const authSchema = {
    '*': {
      { __authz: { rules: ['Reject'] } },
      '*': { __authz: { rules: ['Reject'] } }
    }
  };
```

```ts
  // Reject rule is attached to every Field of User Object
  const authSchema = {
    User: {
      '*': { __authz: { rules: ['Reject'] } }
    }
  };
```

```ts
  // Reject rule is attached to createdAt Field of every Object
  const authSchema = {
    '*': {
      createdAt: { __authz: { rules: ['Reject'] } }
    }
  };
```

### Overwriting wildcard rules

Wildcard rules are attached to Object/Field only if no other rules are attached to it so to overwrite wildcard rule it's only necessary to attach any other rule to the Object/Field. Wildcard rules can be overwritten by rules attached using directive or extensions as well.

```ts
  // Reject rule is attached to all fields of the User object except of the id field. IsAuthenticated rule is attached to the id field.
  const authSchema = {
    User: {
      '*': { __authz: { rules: ['Reject'] } },
      id: { __authz: { rules: ['IsAuthenticated'] } }
    }
  };
```

```ts
  // Reject rule is attached to all Objects except of the User Object. IsAuthenticated rule is attached to the User Object.
  const authSchema = {
    '*': { __authz: { rules: ['Reject'] } },
    User: { __authz: { rules: ['IsAuthenticated'] } }
  };
```

### Wildcard rules priority

Wildcard rules are not composing with each other. Only one wildcard rule is attached to the certain Object/Field. Wildcard rules are attached to a Field in following priority:
1. Any Field in certain Object:
```ts
  const authSchema = {
    User: {
      '*': { __authz: { rules: ['Reject'] } }
    }
  };
```
2. Certain field in any object:
```ts
  const authSchema = {
    '*': {
      createdAt: { __authz: { rules: ['Reject'] } }
    }
  };
```
3. Any field in any object:
```ts
  const authSchema = {
    '*': {
      '*': { __authz: { rules: ['Reject'] } }
    }
  };
```

With following example:

```ts
  const authSchema = {
    '*': {
      '*': { __authz: { rules: ['Rule01'] } },
      id: { __authz: { rules: ['Rule02'] } }
    },
    User: {
      '*': { __authz: { rules: ['Rule03'] } }
    }
  };
```
only Rule03 is attached to the id field of the User object

## Composing rules

### Default composition

Rules that are passed to `@authz` directive as `rules` list are composing with AND logical operator. So `@authz(rules: [Rule01, Rule02])` means that authorization will be passed only if `Rule01` AND `Rule02` passed.

### Create composition rules

To create different composition rules `and`, `or`, `not` functions should be used

```ts
import { and, or, not } from "@graphql-authz/core";

const TestAndRule = and([Rule01, Rule02, Rule03]);

const TestOrRule = or([Rule01, Rule02, Rule03]);

const TestNotRule = not([Rule01, Rule02, Rule03]);
```

Alternatively new class extended from `AndRule`, `OrRule` or `NotRule` can be created

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

`TestAndRule` will pass only if all of `Rule01`, `Rule02`, `Rule03` pass

`TestOrRule` will pass if any of `Rule01`, `Rule02`, `Rule03` pass

`TestNotRule` will pass only if every of `Rule01`, `Rule02`, `Rule03` fail

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

To provide custom error for rule the `error` option should be provided

```ts
import { UnauthorizedError } from '@graphql-authz/core';

const SomeRule = postExecRule({
  error: 'User is not authenticated'
})(() => { /* rule body */ });
```

Using rule class

```ts
import { UnauthorizedError } from '@graphql-authz/core';

class SomeRule extends PreExecutionRule {
  public error = new UnauthorizedError("User is not authenticated");
  public execute() {
    throw this.error;
  }
}
```

It's important to throw an instance of `UnauthorizedError` imported from `@graphql-authz/core` to enable composite rules to correctly handle errors thrown from rules. If an instance of `UnauthorizedError` is thrown it's treated as a certain rule didn't pass. If the rule is wrapped with `NotRule` then execution should continue. Any other errors are treated as runtime errors and are thrown up, so if any other error is thrown from the rule that is wrapped with `NotRule` it will fail the entire request.
