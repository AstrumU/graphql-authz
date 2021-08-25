# @graphql-authz/envelop-plugin

## Configuring for Envelop

Add plugin to envelop
  ```ts
    import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";
    
    const getEnveloped = envelop({
      plugins: [
        useSchema(schema),
        authZEnvelopPlugin({ rules })
      ]
    });
  ```


### For Directives usage

Apply directive transformer to schema
  ```ts
  import { authZDirectiveTransformer } from "@graphql-authz/directive";
  import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";

  const transformedSchema = authZDirectiveTransformer(schema);

  const getEnveloped = envelop({
    plugins: [
      useSchema(transformedSchema),
      authZEnvelopPlugin({ rules })
    ]
  });
  ```

### For AuthSchema usage

Pass additional parameter `authSchema` to `authZEnvelopPlugin`
  ```ts
  import { authZEnvelopPlugin } from "@graphql-authz/envelop-plugin";
    
  const getEnveloped = envelop({
    plugins: [
      useSchema(schema),
      authZEnvelopPlugin({ rules, authSchema })
    ]
  });
  ```