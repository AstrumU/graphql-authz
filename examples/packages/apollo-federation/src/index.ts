import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';
import { authZApolloPlugin } from '@graphql-authz/apollo-server-plugin';

import { authZRules } from './rules';

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'users', url: 'http://localhost:4001/graphql' },
      { name: 'posts', url: 'http://localhost:4002/graphql' }
    ]
  })
});

// authz auth schema
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

function bootstrap() {
  const server = new ApolloServer({
    gateway,
    // authz apollo plugin with auth schema provided
    plugins: [authZApolloPlugin({ rules: authZRules, authSchema })]
  });

  return startStandaloneServer(server, {
    context: async ({ req }) => {
      const userId = req.headers['x-user-id'];
      return {
        user: userId ? { id: req.headers['x-user-id'] } : null
      };
    }
  }).then(({ url }) => console.log(`🚀 Server ready at ${url}`));
}

bootstrap();
