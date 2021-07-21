import {
  SelectionNode,
  SelectionSetNode,
  print,
  TypeInfo,
  Kind,
  parse
} from 'graphql';

import { getNodeAliasOrName } from './graphql-utils';
import { PostExecutionRule } from './rules';
import { ICompiledRules } from './rules-compiler';

export function memoize2<
  T1 extends Record<string, any>, // eslint-disable-line
  T2 extends Record<string, any>, // eslint-disable-line
  R extends any // eslint-disable-line
>(fn: (A1: T1, A2: T2) => R): (A1: T1, A2: T2) => R {
  let cache1: WeakMap<T1, WeakMap<T2, R>>;

  function memoized(a1: T1, a2: T2) {
    if (!cache1) {
      cache1 = new WeakMap();
      const cache2: WeakMap<T2, R> = new WeakMap();
      cache1.set(a1, cache2);
      const newValue = fn(a1, a2);
      cache2.set(a2, newValue);
      return newValue;
    }

    let cache2 = cache1.get(a1);
    if (!cache2) {
      cache2 = new WeakMap();
      cache1.set(a1, cache2);
      const newValue = fn(a1, a2);
      cache2.set(a2, newValue);
      return newValue;
    }

    const cachedValue = cache2.get(a2);
    if (cachedValue === undefined) {
      const newValue = fn(a1, a2);
      cache2.set(a2, newValue);
      return newValue;
    }

    return cachedValue;
  }

  return memoized;
}

const addSelectionsToMap = memoize2(function (
  map: Map<string, SelectionNode>,
  selectionSet: SelectionSetNode
): void {
  selectionSet.selections.forEach(selection => {
    map.set(print(selection), selection);
  });
});

function visitSelectionSet(
  node: SelectionSetNode,
  typeInfo: TypeInfo,
  selectionSetsByType: Record<string, SelectionSetNode>,
  selectionSetsByField: Record<string, Record<string, SelectionSetNode>>
): SelectionSetNode | void {
  const parentType = typeInfo.getParentType();

  const newSelections: Map<string, SelectionNode> = new Map();

  if (parentType != null) {
    const parentTypeName = parentType.name;
    addSelectionsToMap(newSelections, node);

    if (parentTypeName in selectionSetsByType) {
      const selectionSet = selectionSetsByType[parentTypeName];
      addSelectionsToMap(newSelections, selectionSet);
    }

    if (parentTypeName in selectionSetsByField) {
      node.selections.forEach(selection => {
        if (selection.kind === Kind.FIELD) {
          const name = getNodeAliasOrName(selection);
          const selectionSet = selectionSetsByField[parentTypeName][name];
          if (selectionSet != null) {
            addSelectionsToMap(newSelections, selectionSet);
          }
        }
      });
    }

    return {
      ...node,
      selections: Array.from(newSelections.values())
    };
  }
}

function extractSelectionSets(rules: Record<string, PostExecutionRule[]>) {
  return Object.keys(rules).reduce<Record<string, SelectionSetNode>>(
    (result, key) => {
      // TODO: parse selectionSet in rule constructor
      // and store it in rule instance as parsedSelectionSet?
      // anyway selectionSet will be parsed each request on each rule instance
      const selections = rules[key]
        .map(
          ({ selectionSet }) =>
            selectionSet &&
            parse(selectionSet).definitions.map(
              definition =>
                'selectionSet' in definition &&
                definition.selectionSet.selections
            )
        )
        .filter<SelectionNode[][]>(
          (value): value is SelectionNode[][] => !!value
        )
        .flat<SelectionNode[][][], 2>(2);

      result[key] = {
        kind: 'SelectionSet',
        selections
      };

      return result;
    },
    {}
  );
}

export function getVisitor(
  typeInfo: TypeInfo,
  rules: ICompiledRules
): (node: SelectionSetNode) => void | SelectionSetNode {
  const selectionSetsByType = extractSelectionSets(
    rules.postExecutionRules.byType
  );

  const selectionSetsByField = Object.keys(
    rules.postExecutionRules.byField
  ).reduce<Record<string, Record<string, SelectionSetNode>>>(
    (result, typeName) => {
      result[typeName] = extractSelectionSets(
        rules.postExecutionRules.byField[typeName]
      );
      return result;
    },
    {}
  );

  return function visitor(node: SelectionSetNode) {
    return visitSelectionSet(
      node,
      typeInfo,
      selectionSetsByType,
      selectionSetsByField
    );
  };
}
