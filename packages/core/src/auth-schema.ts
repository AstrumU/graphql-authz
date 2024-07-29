import isNil from 'lodash.isnil';
import { IAuthConfig } from './auth-config';
import { isDefined, ToDeepDictionary } from './helpers';

/**
 * GraphQL-style definition of your validation rules applied to
 * [objects types and fields](https://graphql.org/learn/schema/#object-types-and-fields) in your GraphQL schema.
 * [See our authz-schema docs section for some usage examples](https://github.com/AstrumU/graphql-authz?tab=readme-ov-file#using-authschema).
 *
 * For both `typeName` and `fieldName` definition [you could use a wildcard (`*`)](https://github.com/AstrumU/graphql-authz?tab=readme-ov-file#wildcard-rules)
 * to apply your rule for all types or fields within a type.
 *
 * @param typeName - represents your GraphQL type object. These are your custom types and common [Query, Mutation](https://graphql.org/learn/schema/#the-query-and-mutation-types).
 * @param fieldName - represents your GraphQL fields values.
 * @param __authz - is your custom defined [introspection field name](https://graphql.org/learn/introspection/), which stores all your Authz rules definitions. By default it is `__authz` string.
 */
export type AuthSchema = {
  [typeName: string | '*']:
    | {
        [fieldName: string | '*']: {
          [__authz: string]: IAuthConfig;
        };
      }
    | {
        [__authz: string]: IAuthConfig;
      };
};

type TypeSchema = ToDeepDictionary<{
  [fieldName: string | '*']: {
    [__authz: string]: IAuthConfig;
  };
}>
type RuleConfig = ToDeepDictionary<{
  [__authz: string]: IAuthConfig;
}>;
type TypeSchemaOrRuleConfig = TypeSchema | RuleConfig;

/**
 * Representation of authentication rules configuration. @see AuthSchema
 */
export class InternalAuthSchema {
  private rulesSchemaKey: string;

  private schema: ToDeepDictionary<AuthSchema>;

  constructor(rulesSchemaKey: string, schema: AuthSchema) {
    this.rulesSchemaKey = rulesSchemaKey
    this.schema = schema
  }

  public static createIfCan(rulesSchemaKey: string, schema: AuthSchema | undefined): InternalAuthSchema | undefined {
    return isDefined(schema) ? new InternalAuthSchema(rulesSchemaKey, schema) : undefined;
  }

  public getTypeRuleConfig(typeName: string): IAuthConfig | undefined {
    const typeDeclaration = this.schema[typeName];
    return typeDeclaration?.[this.rulesSchemaKey];
  }

  private getTypeAuthSchema(typeName: string): TypeSchema | undefined {
    const typeDeclaration = this.schema[typeName];
    if (isNil(typeDeclaration) || this.isRuleConfig(typeDeclaration)) {
      return undefined
    }

    return typeDeclaration;
  }

  private isRuleConfig(typeDeclaration: TypeSchemaOrRuleConfig): typeDeclaration is RuleConfig {
    return this.rulesSchemaKey in typeDeclaration;
  }

  public getFieldRuleConfig(
    typeName: string,
    fieldName: string,
  ): IAuthConfig | undefined {
    const typeSchema = this.getTypeAuthSchema(typeName);
    return typeSchema?.[fieldName]?.[this.rulesSchemaKey];
  }

  public getAllRuleConfigs(): IAuthConfig[] {
    return Object.keys(this.schema)
      .flatMap(typeName => this.getAllTypeRules(typeName))
  }

  private getAllTypeRules = (typeName: string): IAuthConfig[] => {
    const fullTypeRuleConfig = this.getTypeRuleConfig(typeName);
    if (isDefined(fullTypeRuleConfig)) {
      return [fullTypeRuleConfig]
    }

    const typeSchema = this.getTypeAuthSchema(typeName);
    return Object.keys(typeSchema ?? {})
      .map(fieldName => this.getFieldRuleConfig(typeName, fieldName))
      .filter(isDefined)
  }
}
