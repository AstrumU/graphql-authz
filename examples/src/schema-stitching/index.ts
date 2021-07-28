import { ApolloServer } from 'apollo-server';
import { buildSchema } from 'graphql';
import waitOn from 'wait-on';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { authZApolloPlugin } from '@astrumu/graphql-authz';

import { makeRemoteExecutor } from './lib/make_remote_executor';
import { authZRules } from './lib/rules';
import { AuthZDirective } from './authz-directive';

const { stitchingDirectivesTransformer } = stitchingDirectives();

async function fetchRemoteSDL(executor: ReturnType<typeof makeRemoteExecutor>) {
  const result = await executor({ document: '{ _sdl }' });
  return result.data._sdl;
}

async function makeGatewaySchema() {
  const usersExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const postsExec = makeRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
    schemaDirectives: { authz: AuthZDirective },
    mergeDirectives: true,
    subschemaConfigTransforms: [stitchingDirectivesTransformer],
    subschemas: [
      {
        schema: buildSchema(await fetchRemoteSDL(usersExec)),
        executor: usersExec
      },
      {
        schema: buildSchema(await fetchRemoteSDL(postsExec)),
        executor: postsExec
      }
    ]
  });
}

async function bootstrap() {
  const schema = await makeGatewaySchema();

  const server = new ApolloServer({
    schema,
    plugins: [authZApolloPlugin(authZRules)],
    context: ({ req }) => ({
      user: { id: req.get('x-user-id') }
    })
  });

  server.listen(4000).then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
  });
}

waitOn({ resources: [4001, 4002].map(p => `tcp:${p}`) }, () => bootstrap());
