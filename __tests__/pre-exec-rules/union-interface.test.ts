import { ApolloServer } from '@apollo/server';
import { PreExecutionRule } from '@graphql-authz/core';

import { mockServer } from '../mock-server';

class FieldRule0 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class FieldRule1 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class FieldRule2 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class TypeRule3 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class TypeRule4 extends PreExecutionRule {
  public execute() {
    return;
  }
}

class TypeRule5 extends PreExecutionRule {
  public execute() {
    return;
  }
}

const rules = {
  FieldRule0,
  FieldRule1,
  FieldRule2,
  TypeRule3,
  TypeRule4,
  TypeRule5,
} as const;

(Object.keys(rules) as Array<keyof typeof rules>).forEach(key => {
  jest.spyOn(rules[key].prototype, 'execute');
});

const rawSchema = `
interface TestInterface {
  testField0: String! @authz(rules: [FieldRule0])
}

union TestFieldUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField0: String!
  testField1: String! @authz(rules: [FieldRule1])
}

type SubType2 implements TestInterface {
  testField0: String!
  testField2: String! @authz(rules: [FieldRule2])
}

type SubType3 implements TestInterface @authz(rules: [TypeRule3]) {
  testField0: String!
  testField3: String!
}

union TestTypeUnion = SubType4 | SubType5

type SubType4 @authz(rules: [TypeRule4]) {
  testField4: String!
}

type SubType5 @authz(rules: [TypeRule5]) {
  testField5: String!
}

type Query {
  testInterfaceQuery: TestInterface
  testFieldUnionQuery: TestFieldUnion
  testTypeUnionQuery: TestTypeUnion
}
`;

const rawSchemaWithoutDirectives = `
interface TestInterface {
  testField0: String!
}

union TestFieldUnion = SubType1 | SubType2

type SubType1 implements TestInterface {
  testField0: String!
  testField1: String!
}

type SubType2 implements TestInterface {
  testField0: String!
  testField2: String!
}

type SubType3 implements TestInterface {
  testField0: String!
  testField3: String!
}

union TestTypeUnion = SubType4 | SubType5

type SubType4 {
  testField4: String!
}

type SubType5 {
  testField5: String!
}

type Query {
  testInterfaceQuery: TestInterface
  testFieldUnionQuery: TestFieldUnion
  testTypeUnionQuery: TestTypeUnion
}
`;

const testFieldInterfaceQuery = `
  query test {
    testInterfaceQuery {
      testField0
      ... on SubType1 {
        testField1
      }
      ... on SubType2 {
        testField2
      }
    }
  }
`;

const testTypeInterfaceQuery = `
  query test {
    testInterfaceQuery {
      testField0
      ... on SubType3 {
        testField3
      }
    }
  }
`;

const testFieldUnionQuery = `
  query test {
    testFieldUnionQuery {
      ... on SubType1 {
        testField0
        testField1
      }
      ... on SubType2 {
        testField0
        testField2
      }
    }
  }
`;

const testTypeUnionQuery = `
  query test {
    testTypeUnionQuery {
      ... on SubType4 {
        testField4
      }
      ... on SubType5 {
        testField5
      }
    }
  }
`;

const authSchema = {
  TestInterface: {
    testField0: { __authz: { rules: ['FieldRule0'] } }
  },
  SubType1: {
    testField1: { __authz: { rules: ['FieldRule1'] } }
  },
  SubType2: {
    testField2: { __authz: { rules: ['FieldRule2'] } }
  },
  SubType3: { __authz: { rules: ['TypeRule3'] } },
  SubType4: { __authz: { rules: ['TypeRule4'] } },
  SubType5: { __authz: { rules: ['TypeRule5'] } }
};

function __resolveType(obj: Record<string, unknown>) {
  if ('testField1' in obj) {
    return 'SubType1';
  }
  if ('testField2' in obj) {
    return 'SubType2';
  }
  if ('testField3' in obj) {
    return 'SubType3';
  }
  if ('testField4' in obj) {
    return 'SubType4';
  }
  if ('testField5' in obj) {
    return 'SubType5';
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
                TestFieldUnion: {
                  __resolveType
                },
                TestTypeUnion: {
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

          it('should handle interfaces with fields rules', async () => {
            await server.executeOperation({
              query: testFieldInterfaceQuery
            });

            expect(FieldRule0.prototype.execute).toBeCalledTimes(1);
            expect(FieldRule1.prototype.execute).toBeCalledTimes(1);
            expect(FieldRule2.prototype.execute).toBeCalledTimes(1);
          });

          it('should handle interfaces with types rules', async () => {
            await server.executeOperation({
              query: testTypeInterfaceQuery
            });

            expect(TypeRule3.prototype.execute).toBeCalledTimes(1);
          });

          it('should handle unions with fields rules', async () => {
            await server.executeOperation({
              query: testFieldUnionQuery
            });

            expect(FieldRule1.prototype.execute).toBeCalledTimes(1);
            expect(FieldRule2.prototype.execute).toBeCalledTimes(1);
          });

          it('should handle unions with type rules', async () => {
            const result = await server.executeOperation({
              query: testTypeUnionQuery
            });

            expect(TypeRule4.prototype.execute).toBeCalledTimes(1);
            expect(TypeRule5.prototype.execute).toBeCalledTimes(1);
          });
        });
      }
    );
  }
);
