import { GraphQLSchema, printSchema } from 'graphql';
import { authZApolloPlugin, AuthZDirective, authZDirective } from '../../src';
import { ApolloServerMock } from '../apollo-server-mock';
import { inlineRules, rules } from './rules';

const rawSchema = `
  type TestObject {
    failingAndRuleField: String @authz(rules: [FailingAndRule])
    passingAndRuleField: String @authz(rules: [PassingAndRule])
    failingOrRuleField: String @authz(rules: [FailingOrRule])
    passingOrRuleField: String @authz(rules: [PassingOrRule])
    failingNotRuleField: String @authz(rules: [FailingNotRule])
    passingNotRuleField: String @authz(rules: [PassingNotRule])
    failingDeepAndRuleField: String @authz(rules: [FailingDeepAndRule])
    passingDeepAndRuleField: String @authz(rules: [PassingDeepAndRule])
    failingDeepOrRuleField: String @authz(rules: [FailingDeepOrRule])
    passingDeepOrRuleField: String @authz(rules: [PassingDeepOrRule])
    failingDeepNotRuleField: String @authz(rules: [FailingDeepNotRule])
    passingDeepNotRuleField: String @authz(rules: [PassingDeepNotRule])

    failingAndRuleInlineField: String @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    passingAndRuleInlineField: String @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    failingOrRuleInlineField: String @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    passingOrRuleInlineField: String @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    failingNotRuleInlineField: String @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    passingNotRuleInlineField: String @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    failingDeepAndRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    passingDeepAndRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    failingDeepOrRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    passingDeepOrRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    failingDeepNotRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    passingDeepNotRuleInlineField: String @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])

    failingAndRuleListField: [String] @authz(rules: [FailingAndRule])
    passingAndRuleListField: [String] @authz(rules: [PassingAndRule])
    failingOrRuleListField: [String] @authz(rules: [FailingOrRule])
    passingOrRuleListField: [String] @authz(rules: [PassingOrRule])
    failingNotRuleListField: [String] @authz(rules: [FailingNotRule])
    passingNotRuleListField: [String] @authz(rules: [PassingNotRule])
    failingDeepAndRuleListField: [String] @authz(rules: [FailingDeepAndRule])
    passingDeepAndRuleListField: [String] @authz(rules: [PassingDeepAndRule])
    failingDeepOrRuleListField: [String] @authz(rules: [FailingDeepOrRule])
    passingDeepOrRuleListField: [String] @authz(rules: [PassingDeepOrRule])
    failingDeepNotRuleListField: [String] @authz(rules: [FailingDeepNotRule])
    passingDeepNotRuleListField: [String] @authz(rules: [PassingDeepNotRule])

    failingAndRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingAndRuleInline}])
    passingAndRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingAndRuleInline}])
    failingOrRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingOrRuleInline}])
    passingOrRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingOrRuleInline}])
    failingNotRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.failingNotRuleInline}])
    passingNotRuleInlineListField: [String] @authz(compositeRules: [${inlineRules.passingNotRuleInline}])
    failingDeepAndRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepAndRuleInline}])
    passingDeepAndRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepAndRuleInline}])
    failingDeepOrRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepOrRuleInline}])
    passingDeepOrRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepOrRuleInline}])
    failingDeepNotRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.failingDeepNotRuleInline}])
    passingDeepNotRuleInlineListField: [String] @authz(deepCompositeRules: [${inlineRules.passingDeepNotRuleInline}])
  }

  type Query {
    testQuery: TestObject
  }
`;

describe('Composite rules', () => {
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
      mocks: true,
      mockEntireSchema: true,
      plugins: [plugin],
      schemaDirectives: { authz: AuthZDirective }
    });
    await server.willStart();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe.each([
    'failingAndRule',
    'passingAndRule',
    'failingOrRule',
    'passingOrRule',
    'failingNotRule',
    'passingNotRule',
    'failingDeepAndRule',
    'passingDeepAndRule',
    'failingDeepOrRule',
    'passingDeepOrRule',
    'failingDeepNotRule',
    'passingDeepNotRule'
  ])('%s', ruleName => {
    describe.each(['', 'Inline'])('%s', ruleVariant => {
      describe.each(['', 'List'])('%s', resultVariant => {
        it('should fail on failing rules and not fail on passing rules', async () => {
          let result;
          let error;
          try {
            result = await server.executeOperation({
              query: `query Test {
                      testQuery {
                        ${ruleName}${ruleVariant}${resultVariant}Field
                      }
                    }`
            });
          } catch (e) {
            error = e;
          }

          if (ruleName.startsWith('failing')) {
            const requestError = error || result?.errors?.[0];
            expect(requestError).toBeDefined();
            expect(requestError.extensions.code).toEqual('FORBIDDEN');
          } else {
            expect(result).toBeDefined();
            expect(result?.data?.testQuery).toHaveProperty(
              `${ruleName}${ruleVariant}${resultVariant}Field`
            );
            const fieldData =
              result?.data?.testQuery[
                `${ruleName}${ruleVariant}${resultVariant}Field`
              ];
            expect(
              typeof (resultVariant === 'List' ? fieldData[0] : fieldData)
            ).toEqual('string');
          }
        });
      });
    });
  });
});
