import { ApolloServer, gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';
import {
  authZGraphQLDirective,
  directiveTypeDefs
} from '@astrumu/graphql-authz';

import { users } from '../../db';
import { authZRules } from '../../rules';

const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

const typeDefs = gql`
  ${authZDirectiveTypeDefs}
  type User @key(fields: "id") {
    id: ID!
    username: String!
    email: String! @authz(rules: [IsAdmin])
    role: String!
  }

  extend type Query {
    users: [User!]! @authz(rules: [IsAuthenticated])
    user(id: ID!): User!
  }
`;

const resolvers = {
  Query: {
    users: () => users,
    user: (parent: unknown, args: Record<string, unknown>) =>
      users.find(({ id }) => id === args.id)
  },
  User: {
    __resolveReference(object: { id: string }) {
      return users.find(user => user.id === object.id);
    }
  }
};

const server = new ApolloServer({
  schema: buildFederatedSchema([
    {
      typeDefs,
      resolvers
    }
  ])
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
