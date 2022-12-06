import { ApolloServer } from '@apollo/server';
import { PreExecutionRule } from '@graphql-authz/core';

import { mockServer } from '../mock-server';

class Rule1 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class Rule2 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class Rule3 extends PreExecutionRule {
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
  testInterfaceQuery: TestInterface
  testUnionQuery: TestUnion
}
`;

const rawSchemaWithoutDirectives = `
interface TestInterface {
  testField1: String!
}

union TestUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField1: String!
  testField2: String!
}

type SubType2 implements TestInterface {
  testField1: String!
  testField3: String!
}

type Query {
  testInterfaceQuery: TestInterface
  testUnionQuery: TestUnion
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

const authSchema = {
  TestInterface: {
    testField1: { __authz: { rules: ['Rule1'] } }
  },
  SubType1: {
    testField2: { __authz: { rules: ['Rule2'] } }
  },
  SubType2: {
    testField3: { __authz: { rules: ['Rule3'] } }
  }
};

function __resolveType(obj: Record<string, unknown>) {
  if ('testField2' in obj) {
    return 'SubType1';
  }
  if ('testField3' in obj) {
    return 'SubType2';
  }
  return null;
}

describe.each(['apollo-plugin', 'envelop-plugin'] as const)(
  '%s',
  integrationMode => {
    describe.each(['directive', 'authSchema'] as const)(
      '%s',
      declarationMode => {
        describe('pre execution rule', () => {
          let server: ApolloServer;

          beforeAll(() => {
            server = mockServer({
              integrationMode,
              rules,
              rawSchema,
              rawSchemaWithoutDirectives,
              declarationMode,
              authSchema,
              resolvers: {
                TestUnion: {
                  __resolveType
                },
                TestInterface: {
                  __resolveType
                }
              }
            });
          });

          afterEach(() => {
            jest.clearAllMocks();
          });

          it('should handle interfaces', async () => {
            await server.executeOperation({
              query: testInterfaceQuery
            });

            expect(Rule1.prototype.execute).toBeCalledTimes(1);
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
      }
    );
  }
);
