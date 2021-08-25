import { RulesObject } from './rules';

export interface ICompositeRulesConfigItem<
  TRules extends RulesObject = RulesObject
> {
  and?: (keyof TRules)[];
  or?: (keyof TRules)[];
  not?: keyof TRules;
}

export interface IDeepCompositeRulesConfigItem<
  TRules extends RulesObject = RulesObject
> {
  id?: keyof TRules;
  and?: IDeepCompositeRulesConfigItem<TRules>[];
  or?: IDeepCompositeRulesConfigItem<TRules>[];
  not?: IDeepCompositeRulesConfigItem<TRules>;
}

export interface IAuthConfig<TRules extends RulesObject = RulesObject> {
  rules?: (keyof TRules)[];
  compositeRules?: ICompositeRulesConfigItem<TRules>[];
  deepCompositeRules?: IDeepCompositeRulesConfigItem<TRules>[];
}
