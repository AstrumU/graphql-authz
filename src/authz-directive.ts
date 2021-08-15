import {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLEnumType,
  GraphQLEnumValueConfigMap,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLObjectType
} from 'graphql';
import { SchemaDirectiveVisitor } from 'apollo-server';

import { RulesObject } from './rules';
import { IAuthConfig } from './auth-config';

export interface IExtensionsDirective<
  TRules extends RulesObject = RulesObject
> {
  name: string;
  arguments: IAuthConfig<TRules>;
}

// TODO: implement directive validation
export function authZGraphQLDirective(
  rules: RulesObject,
  directiveName = 'authz'
): GraphQLDirective {
  const RulesEnum = new GraphQLEnumType({
    name: 'AuthZRules',
    values: Object.keys(rules).reduce<GraphQLEnumValueConfigMap>(
      (result, key) => {
        result[key] = { value: rules[key].name };
        return result;
      },
      {}
    )
  });

  const CompositeRulesInput = new GraphQLInputObjectType({
    name: 'AuthZDirectiveCompositeRulesInput',
    fields: {
      and: { type: new GraphQLList(RulesEnum) },
      or: { type: new GraphQLList(RulesEnum) },
      not: { type: RulesEnum }
    }
  });

  const DeepCompositeRulesInput: GraphQLInputObjectType =
    new GraphQLInputObjectType({
      name: 'AuthZDirectiveDeepCompositeRulesInput',
      fields: () => ({
        id: { type: RulesEnum },
        and: { type: new GraphQLList(DeepCompositeRulesInput) },
        or: { type: new GraphQLList(DeepCompositeRulesInput) },
        not: { type: DeepCompositeRulesInput }
      })
    });

  return new GraphQLDirective({
    name: directiveName,
    locations: [
      DirectiveLocation.FIELD_DEFINITION,
      DirectiveLocation.OBJECT,
      DirectiveLocation.INTERFACE
    ],
    args: {
      rules: { type: new GraphQLList(RulesEnum) },
      compositeRules: { type: new GraphQLList(CompositeRulesInput) },
      deepCompositeRules: { type: new GraphQLList(DeepCompositeRulesInput) }
    }
  });
}

export class AuthZDirectiveVisitor extends SchemaDirectiveVisitor {
  private addAuthZExtensionsDirective(
    schemaItem:
      | GraphQLField<unknown, unknown>
      | GraphQLObjectType
      | GraphQLInterfaceType,
    authZExtensionsDirective: IExtensionsDirective
  ): void {
    schemaItem.extensions = {
      ...schemaItem.extensions,
      authz: {
        ...schemaItem.extensions?.authz,
        directives: [
          ...(schemaItem.extensions?.authz?.directives || []),
          authZExtensionsDirective
        ]
      }
    };
  }

  public visitFieldDefinition(field: GraphQLField<unknown, unknown>): void {
    this.addAuthZExtensionsDirective(field, {
      name: this.name,
      arguments: this.args
    });
  }

  public visitObject(object: GraphQLObjectType): void {
    this.addAuthZExtensionsDirective(object, {
      name: this.name,
      arguments: this.args
    });
  }

  public visitInterface(iface: GraphQLInterfaceType): void {
    this.addAuthZExtensionsDirective(iface, {
      name: this.name,
      arguments: this.args
    });
  }
}
