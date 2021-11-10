# @graphql-authz/apollo-server-plugin

## Configuring Apollo Server

Ensure context parser is configured to perform authentication and add user info to context
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

### For Directives usage

Apply authZDirectiveTransformer to schema and add plugin to apollo-server
  ```ts
    import { makeExecutableSchema } from '@graphql-tools/schema';
    import { authZDirective } from '@graphql-authz/directive';
    import { authZApolloPlugin } from "@graphql-authz/apollo-server-plugin";

    const { authZDirectiveTransformer } = authZDirective();

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    });
    
    const transformedSchema = authZDirectiveTransformer(schema);

    const server = new ApolloServer({
      ...
      schema: transformedSchema,
      plugins: [authZApolloPlugin({ rules })],
      ...
    });
  ```


### For Extensions usage

Add plugin to apollo-server
  ```ts
    import { authZApolloPlugin } from "@graphql-authz/apollo-server-plugin";;

    const server = new ApolloServer({
      ...
      plugins: [authZApolloPlugin({ rules })],
      ...
    });
  ```
### For AuthSchema usage

Add plugin to apollo-server with an additional parameter `authSchema` 
  ```ts
    import { authZApolloPlugin } from "@graphql-authz/apollo-server-plugin";;

    const server = new ApolloServer({
      ...
      plugins: [authZApolloPlugin({ rules, authSchema })],
      ...
    });
  ```