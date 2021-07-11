import { GraphQLSchema, printSchema } from 'graphql';
import {
  authZApolloPlugin,
  authZDirective,
  PostExecutionRule
} from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';

class Rule1 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class Rule2 extends PostExecutionRule {
  public execute() {
    return;
  }
}

class Rule3 extends PostExecutionRule {
  public execute() {
    return;
  }
}

const rules = {
  Rule1,
  Rule2,
  Rule3
} as const;

(Object.keys(rules) as Array<keyof typeof rules>).forEach(key => {
  jest.spyOn(rules[key].prototype, 'execute');
});

const rawSchema = `
interface TestInterface {
  testField1: String! @authz(rules: [Rule1])
}

union TestUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField1: String!
  testField2: String! @authz(rules: [Rule2])
}

type SubType2 implements TestInterface {
  testField1: String!
  testField3: String! @authz(rules: [Rule3])
}

type Query {
  testInterfaceQuery: [TestInterface!]!
  testUnionQuery: [TestUnion!]!
}
`;

const testInterfaceQuery = `
  query test {
    testInterfaceQuery {
      testField1
      ... on SubType1 {
        testField2
      }
      ... on SubType2 {
        testField3
      }
    }
  }
`;

const testUnionQuery = `
  query test {
    testUnionQuery {
      ... on SubType1 {
        testField1
        testField2
      }
      ... on SubType2 {
        testField1
        testField3
      }
    }
  }
`;

function __resolveType(obj: Record<string, unknown>) {
  if ('testField2' in obj) {
    return 'SubType1';
  }
  if ('testField3' in obj) {
    return 'SubType2';
  }
  return null;
}

describe('post execution rule', () => {
  let server: ApolloServerMock;
  let typeDefs: string;

  beforeAll(async () => {
    const plugin = authZApolloPlugin(rules);
    const directive = authZDirective(rules);
    const directiveSchema = new GraphQLSchema({
      directives: [directive]
    });

    typeDefs = `${printSchema(directiveSchema)}
        ${rawSchema}`;

    server = new ApolloServerMock({
      typeDefs,
      mocks: {
        Query: () => ({
          testUnionQuery: () => [
            {
              testField1: 'testField1Value',
              testField2: 'testField2Value',
              __typename: 'SubType1'
            },
            {
              testField1: 'testField1Value',
              testField3: 'testField3Value',
              __typename: 'SubType2'
            }
          ],
          testInterfaceQuery: () => [
            {
              testField1: 'testField1Value',
              testField2: 'testField2Value',
              __typename: 'SubType1'
            },
            {
              testField1: 'testField1Value',
              testField3: 'testField3Value',
              __typename: 'SubType2'
            }
          ]
        })
      },
      resolvers: {
        TestUnion: {
          __resolveType
        },
        TestInterface: {
          __resolveType
        }
      },
      mockEntireSchema: true,
      plugins: [plugin]
    });
    await server.willStart();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle interfaces', async () => {
    await server.executeOperation({
      query: testInterfaceQuery
    });

    expect(Rule1.prototype.execute).toBeCalledTimes(2);
    expect(Rule2.prototype.execute).toBeCalledTimes(1);
    expect(Rule3.prototype.execute).toBeCalledTimes(1);
  });

  it('should handle unions', async () => {
    await server.executeOperation({
      query: testUnionQuery
    });

    expect(Rule2.prototype.execute).toBeCalledTimes(1);
    expect(Rule3.prototype.execute).toBeCalledTimes(1);
  });
});
