export function isNil<V>(
  value: V | null | undefined
): value is null | undefined {
  return value === null || value === undefined;
}

export function isDefined<V>(value: V | null | undefined): value is V {
  return !isNil(value);
}

export type RequireAllExcept<T, Exceptions extends keyof T> = Required<Omit<T, Exceptions>> & Pick<T, Exceptions>

type ObjectKey = string | number | symbol;

/**
 * More type correct {@link Record}. Marks all accessed properties from type as potentially `undefined`.
 */
export type Dictionary<K extends ObjectKey, V> = {
  [key in K]: V | undefined;
};

/**
 * Converts your nested {@link Record} type to a {@link Dictionary}.
 */
export type ToDeepDictionary<T extends Record<ObjectKey, any>> = {
  [P in keyof T]: T[P] extends Record<ObjectKey, any>
    ? ToDeepDictionary<T[P]> | undefined
    : T[P] | undefined;
};
