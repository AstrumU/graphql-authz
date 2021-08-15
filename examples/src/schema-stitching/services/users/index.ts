import { ApolloServer, gql } from 'apollo-server';
import { stitchingDirectives } from '@graphql-tools/stitching-directives';
import { makeExecutableSchema } from '@graphql-tools/schema';
import {
  authZGraphQLDirective,
  directiveTypeDefs
} from '@astrumu/graphql-authz';

import { authZRules } from '../../lib/rules';

const directive = authZGraphQLDirective(authZRules);
const authZDirectiveTypeDefs = directiveTypeDefs(directive);

const { stitchingDirectivesTypeDefs, stitchingDirectivesValidator } =
  stitchingDirectives();

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

const resolvers = {
  Query: {
    users: () => users,
    user: (parent: unknown, args: { id: string }) =>
      users.find(({ id }) => id === args.id),
    _sdl: () => typeDefs.loc?.source.body
  }
};

const schema = makeExecutableSchema({
  schemaTransforms: [stitchingDirectivesValidator],
  typeDefs,
  resolvers
});

const server = new ApolloServer({
  schema
});

server.listen(4001).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
