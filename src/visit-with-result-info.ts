import {
  ASTNode,
  FragmentDefinitionNode,
  SelectionSetNode,
  TypeInfo
} from 'graphql';
import _ from 'lodash';

import {
  getListTypeDepth,
  getNodeAliasOrName,
  shouldIncludeNode
} from './graphql-utils';
import { ResultInfo } from './result-info';

export function visitWithResultInfo(
  resultInfo: ResultInfo,
  typeInfo: TypeInfo,
  fragmentDefinitions: FragmentDefinitionNode[],
  variables: Record<string, unknown>,
  fieldVisitFn: (resultInfo: ResultInfo, typeInfo: TypeInfo) => void
): {
  enter(node: ASTNode): false | SelectionSetNode | undefined;
  leave(node: ASTNode): void;
} {
  const resultInfoList = [resultInfo];
  return {
    enter(node: ASTNode) {
      switch (node.kind) {
        case 'FragmentSpread': {
          const fragmentDefinition = fragmentDefinitions.find(
            definition => definition.name.value === node.name.value
          );
          return fragmentDefinition?.selectionSet;
        }
        case 'FragmentDefinition':
          return false;
        case 'Field': {
          if (!shouldIncludeNode({ variableValues: variables }, node)) {
            return false;
          }
          // TODO: move this to ResultInfo and use resultInfo.enter(node)? how to get index for lists?
          const name = getNodeAliasOrName(node);

          const listDepth = getListTypeDepth(typeInfo.getType());
          resultInfoList.map(resultInfo => {
            resultInfo.enter(name);
            if (listDepth && resultInfo.getValue() !== undefined) {
              fieldVisitFn(resultInfo, typeInfo);
            }
          });

          for (let i = 0; i < listDepth; i++) {
            resultInfoList.map(resultInfo => {
              const list = resultInfo.getValue() as unknown[];
              const pathFromRoot = resultInfo.getPathFromRoot();
              resultInfo.enter(0);
              list &&
                list.map((value, index) => {
                  if (index !== 0) {
                    const newResultInfo = new ResultInfo(list, pathFromRoot);
                    newResultInfo.enter(index);
                    resultInfoList.push(newResultInfo);
                  }
                });
            });
          }
          resultInfoList.map(resultInfo => {
            // for union types and null-branches
            if (resultInfo.getValue() !== undefined) {
              return fieldVisitFn(resultInfo, typeInfo);
            }
          });

          // TODO: return false if value is null to stop visiting current branch
          // exception is arrays where in some item branch can be null, but not in other items
          // if (resultInfoList.length === 1 && !resultInfoList[0].getValue()) return null;
          return undefined;
        }
      }

      return undefined;
    },
    leave(node: ASTNode) {
      switch (node.kind) {
        case 'Field': {
          const listDepth = getListTypeDepth(typeInfo.getType());
          resultInfoList.map(resultInfo => {
            if (listDepth) {
              for (let i = 0; i < listDepth; i++) {
                // additional leave() from array index
                resultInfo.leave();
              }
            }
            const pathLeft = resultInfo.leave();
            if (!pathLeft) {
              _.remove(resultInfoList, item => item === resultInfo);
            }
          });
          break;
        }
      }
    }
  };
}
