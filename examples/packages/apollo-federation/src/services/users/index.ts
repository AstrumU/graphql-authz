import { ApolloServer, gql } from 'apollo-server';
import { buildFederatedSchema } from '@apollo/federation';

import { users } from '../../db';

// schema
const typeDefs = gql`
  type User @key(fields: "id") {
    id: ID!
    username: String!
    email: String!
    role: String!
  }

  extend type Query {
    users: [User!]!
    user(id: ID!): User!
  }
`;

// resolvers
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
