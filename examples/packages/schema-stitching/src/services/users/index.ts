import gql from 'graphql-tag';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { directiveTypeDefs } from '@graphql-authz/core';
import { authZGraphQLDirective } from '@graphql-authz/directive';

import { authZRules } from '../../lib/rules';

// authz directive to print definitions to schema
const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

const { stitchingDirectivesTypeDefs } = stitchingDirectives();

// schema
const typeDefs = gql`
  ${authZDirectiveTypeDefs}
  ${stitchingDirectivesTypeDefs}

  type User @key(selectionSet: "{ id }") {
    id: ID!
    username: String!
    email: String! @authz(rules: [IsAdmin])
    role: String!
  }

  type Query {
    users: [User!]! @authz(rules: [IsAuthenticated])
    user(id: ID!): User! @merge(keyField: "id")
    _sdl: String!
  }
`;

// data
const users = [
  {
    id: '1',
    username: 'user01',
    email: 'user01@gmail.com',
    role: 'Customer'
  },
  {
    id: '2',
    username: 'user02',
    email: 'user02@gmail.com',
    role: 'Admin'
  }
];

// resolvers
const resolvers = {
  Query: {
    users: () => users,
    user: (parent: unknown, args: { id: string }) =>
      users.find(({ id }) => id === args.id),
    _sdl: () => typeDefs.loc?.source.body
  }
};

const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

startStandaloneServer(server, { listen: { port: 4001 } }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
