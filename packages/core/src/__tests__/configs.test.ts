import { RulesObject, InstantiableRule } from '../rules';
import { completeConfig } from '../config';

describe('completeConfig', () => {
  it('Throws error if auth schema contains not registered rules', () => {
    const authSchema = {
      '*': { __authz: { rules: ['Registered rule 1'] } },
      Query: { __authz: { rules: ['Registered rule 2'] } },
      Mutation: {
        '*': { __authz: { rules: ['Not registered rule 2'] } }
      },
      User: { __authz: { rules: ['Not registered rule 2'] } }
    };
    const rulesRegistry: RulesObject = {
      'Registered rule 1': {} as InstantiableRule,
      'Registered rule 2': {} as InstantiableRule
    };

    expect(() =>
      completeConfig({ rules: rulesRegistry, authSchema })
    ).toThrowError();
  });

  it('Do nothing if all rules are registered', () => {
    const authSchema = {
      '*': { __authz: { rules: ['Registered rule 1'] } },
      Query: { __authz: { rules: ['Registered rule 2'] } }
    };
    const rulesRegistry: RulesObject = {
      'Registered rule 1': {} as InstantiableRule,
      'Registered rule 2': {} as InstantiableRule
    };

    expect(() =>
      completeConfig({ rules: rulesRegistry, authSchema })
    ).not.toThrowError();
  });
});
