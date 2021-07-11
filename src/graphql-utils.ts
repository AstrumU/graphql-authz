import {
  ASTNode,
  DocumentNode,
  EnumValueNode,
  FieldNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  getDirectiveValues,
  GraphQLIncludeDirective,
  GraphQLList,
  GraphQLNonNull,
  GraphQLSkipDirective,
  GraphQLType,
  InlineFragmentNode,
  isListType,
  isValueNode,
  Kind,
  ListValueNode,
  ObjectValueNode,
  ValueNode,
  parse,
  DefinitionNode,
  Location
} from 'graphql';
import { Maybe } from 'graphql/jsutils/Maybe';

type WrappedType = GraphQLList<any> | GraphQLNonNull<any>; // eslint-disable-line
type DeepType = Exclude<GraphQLType, WrappedType>;

export function isWrappedType(type: GraphQLType): type is WrappedType {
  return 'ofType' in type && type.ofType;
}

export function isListTypeDeep(type: Maybe<GraphQLType>): boolean {
  if (!type) {
    return false;
  }

  if (isListType(type)) {
    return true;
  }
  if (isWrappedType(type)) {
    return isListType(type.ofType);
  }
  return false;
}

export function getListTypeDepth(
  type: Maybe<GraphQLType>,
  initialDepth = 0
): number {
  let depth = initialDepth;
  if (!type) {
    return depth;
  }

  if (isListType(type)) {
    depth++;
  }

  if (isWrappedType(type)) {
    return getListTypeDepth(type.ofType, depth);
  }

  return depth;
}

export function getDeepType(type: GraphQLType): DeepType {
  if (isWrappedType(type)) {
    return getDeepType(type.ofType);
  }
  return type;
}

export function isLeafTypeDeep(type: GraphQLType): boolean {
  const deepType = getDeepType(type);
  return !(
    deepType?.astNode &&
    'fields' in deepType.astNode &&
    deepType.astNode.fields?.length
  );
}

export function isListValueNode(node: ASTNode): node is ListValueNode {
  return isValueNode(node) && !!(node as ListValueNode).values;
}

export function isEnumValueNode(node: ASTNode): node is EnumValueNode {
  return node.kind === 'EnumValue';
}

export function assertEnumValueNode(node: ASTNode): EnumValueNode {
  if (!isEnumValueNode(node)) {
    throw new Error(
      `Expected ${JSON.stringify(node)} to be a GraphQL Enum value`
    );
  }
  return node;
}

export function isObjectValueNode(node: ASTNode): node is ObjectValueNode {
  return node.kind === 'ObjectValue';
}

export function assertObjectValueNode(node: ASTNode): ObjectValueNode {
  if (!isObjectValueNode(node)) {
    throw new Error(
      `Expected ${JSON.stringify(node)} to be a GraphQL Object value`
    );
  }
  return node;
}

export function getValueNodes(valueNode: ValueNode): readonly ValueNode[] {
  return isListValueNode(valueNode) ? valueNode.values : [valueNode];
}

export function getNodeAliasOrName(node: FieldNode): string {
  return (node.alias?.kind === 'Name' && node.alias.value) || node.name.value;
}

export function getFilteredAst(
  query: string,
  operationName?: string
): {
  definitions: readonly DefinitionNode[];
  kind: 'Document';
  loc?: Location | undefined;
} {
  const ast = parse(query);
  // by default, definitions contains all queries, mutations, fragments of the document
  // TODO: throw Error if there are no definitions matched with operationName?
  // there can be anonymous definitions without name
  // introspection query from graphql-codegen has no operationName at all
  const filteredDefinitions = operationName
    ? ast.definitions.filter(
        definition =>
          definition.kind !== 'OperationDefinition' ||
          ('name' in definition && definition.name?.value === operationName)
      )
    : ast.definitions;
  const filteredAst = {
    ...ast,
    definitions: filteredDefinitions
  };
  return filteredAst;
}

export function getFragmentDefinitions(
  ast: DocumentNode
): FragmentDefinitionNode[] {
  return ast.definitions.filter<FragmentDefinitionNode>(
    (node): node is FragmentDefinitionNode =>
      node.kind === Kind.FRAGMENT_DEFINITION
  );
}

/**
 * // TODO: create an issue for exporting this function
 * Copied from graphql-js. They should export this function for plugin writers
 * Determines if a field should be included based on the @include and @skip
 * directives, where @skip has higher precedence than @include.
 */
export function shouldIncludeNode(
  exeContext: { variableValues: Record<string, unknown> },
  node: FragmentSpreadNode | FieldNode | InlineFragmentNode
): boolean {
  const skip = getDirectiveValues(
    GraphQLSkipDirective,
    node,
    exeContext.variableValues
  );
  if (skip?.if === true) {
    return false;
  }

  const include = getDirectiveValues(
    GraphQLIncludeDirective,
    node,
    exeContext.variableValues
  );
  if (include?.if === false) {
    return false;
  }
  return true;
}
