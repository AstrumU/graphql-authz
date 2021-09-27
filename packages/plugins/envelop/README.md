# @graphql-authz/envelop-plugin

## Configuring for Envelop

Ensure context parser is configured to perform authentication and add user info to context
```ts
  const getEnveloped = envelop({
    plugins: [
      ...
      useExtendContext(req => ({
        user: someHowAuthenticateUser(req.get("authorization"))),
      })),
      ...
    ]
  });

```

or

```ts
  getEnveloped({
    user: someHowAuthenticateUser(req.get("authorization"))),
  });

```

Add plugin to envelop
  ```ts
    import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";
    
    const getEnveloped = envelop({
      plugins: [
        ...
        authZEnvelopPlugin({ rules })
        ...
      ]
    });
  ```


### For Directives usage

Apply directive transformer to schema
  ```ts
  import { authZDirective } from '@graphql-authz/directive';
  import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";

  const { authZDirectiveTransformer } = authZDirective();

  const transformedSchema = authZDirectiveTransformer(schema);

  const getEnveloped = envelop({
    plugins: [
      useSchema(transformedSchema),
      authZEnvelopPlugin({ rules })
      ...
    ]
  });
  ```

### For AuthSchema usage

Pass additional parameter `authSchema` to `authZEnvelopPlugin`
  ```ts
  import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";
    
  const getEnveloped = envelop({
    plugins: [
      ...
      authZEnvelopPlugin({ rules, authSchema })
      ...
    ]
  });
  ```