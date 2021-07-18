import _ from 'lodash';
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

export interface ICompositeRulesArgumentItem {
  and?: string[];
  or?: string[];
  not?: string;
}
export interface IDeepCompositeRulesArgumentItem {
  id?: string;
  and?: IDeepCompositeRulesArgumentItem[];
  or?: IDeepCompositeRulesArgumentItem[];
  not?: IDeepCompositeRulesArgumentItem;
}
export interface IExtensionsDirectiveArguments {
  rules?: string[];
  compositeRules?: ICompositeRulesArgumentItem[];
  deepCompositeRules?: IDeepCompositeRulesArgumentItem[];
}
export interface IExtensionsDirective {
  name: string;
  arguments: IExtensionsDirectiveArguments;
}

// TODO: implement directive validation
export function authZDirective(
  rules: RulesObject,
  directiveName = 'authz'
): GraphQLDirective {
  const RulesEnum = new GraphQLEnumType({
    name: 'AuthZRules',
    values: _.reduce<RulesObject, GraphQLEnumValueConfigMap>(
      rules,
      (result, rule, key) => {
        result[key] = { value: rule.name };
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

export class AuthZDirective extends SchemaDirectiveVisitor {
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
