# graphql-authz examples

To run examples you can follow several steps:

- see GraphQL 15 section to run NestJS, TypeGraphQL or Apollo Federation examples
- `pnpm i && pnpm build` from the root of repository
- `cd examples`
- `pnpm i && pnpm build` from the examples folder

After that you can run one of the following commands to start server configured with corresponding technologies:

- `pnpm start:apollo-server-schema-first`
- `pnpm start:apollo-server-code-first`
- `pnpm start:envelop`
- `pnpm start:express-graphql`
- `pnpm start:graphql-helix`
- `pnpm start:schema-stitching`
- `pnpm start:apollo-federation`

## GraphQL 15

To run examples which don't support GraphQL 16 right now please run

`node ./scripts/downgrade-graphql-version.js 15` as a first step before `pnpm i && pnpm build` from the root of repository.

After that you can run one of the following commands to start server configured with corresponding technologies:

- `pnpm start:nestjs`
- `pnpm start:type-graphql`


To switch back to GraphQL 16 please discard all git changes and run `pnpm clean` in both root of repository and examples folder and then `pnpm i && pnpm build` in both.

## Testing

All examples listen to POST requests to `localhost:4000`

You can run following operations:

```
query users {
  users {
     id
     email
  }
}
```

```
mutation publishPost {
  publishPost(postId: 1) {
    id
  }
}
```

```
query posts {
  posts {
    id
  }  
}
```

```
query post {
  post(id: 1) {
    id
    title
    body
    status
  }
}
```

For anonymous user all operations will fail with different errors.

If you add `x-user-id` header with value `2` then you can run only `query users`. All other operations will throw. Also you can read post with id `2`.

If you add `x-user-id` header with value `1` then you can run following operations:
- `query users` without `email` field
- `mutation publishPost`
- `query posts`
- `query post`

User `2` gets an access to `query posts` and `query post` operations after `mutation publishPost` was executed by user `1`.
