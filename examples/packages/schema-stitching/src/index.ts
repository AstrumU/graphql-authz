import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema } from 'graphql';
import waitOn from 'wait-on';
import { stitchSchemas } from '@graphql-tools/stitch';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { authZApolloPlugin } from '@graphql-authz/apollo-server-plugin';
import { authZDirective } from '@graphql-authz/directive';

import { makeRemoteExecutor } from './lib/make_remote_executor';
import { authZRules } from './lib/rules';

const { authZDirectiveTransformer } = authZDirective();
const { stitchingDirectivesTransformer } = stitchingDirectives();

async function fetchRemoteSDL(executor: ReturnType<typeof makeRemoteExecutor>) {
  const result = await executor({ document: '{ _sdl }' });
  return result.data._sdl;
}

async function makeGatewaySchema() {
  const usersExec = makeRemoteExecutor('http://localhost:4001/graphql');
  const postsExec = makeRemoteExecutor('http://localhost:4002/graphql');

  return stitchSchemas({
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
  const gatewaySchema = await makeGatewaySchema();
  const schema = authZDirectiveTransformer(gatewaySchema);

  const server = new ApolloServer({
    schema,
    // authz apollo plugin
    plugins: [authZApolloPlugin({ rules: authZRules })]
  });

  return startStandaloneServer(server, {
    listen: { port: 4000 },
    context: async ({ req }) => {
      const userId = req.headers['x-user-id'];
      console.log('userId ==========>', userId);
      return {
        user: userId ? { id: req.headers['x-user-id'] } : null
        
      };
    }
  }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
}

waitOn({ resources: [4001, 4002].map(p => `tcp:${p}`) }, () => bootstrap());
