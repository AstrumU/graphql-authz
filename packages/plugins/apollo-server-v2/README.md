# @graphql-authz/apollo-server-plugin-v2

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

Add plugin and directive visitor to apollo-server
  ```ts
    import { authZApolloPlugin, AuthZDirectiveVisitor } from "@graphql-authz/apollo-server-plugin";

    const server = new ApolloServer({
      ...
      plugins: [authZApolloPlugin({ rules })],
      schemaDirectives: { authz: AuthZDirectiveVisitor },
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