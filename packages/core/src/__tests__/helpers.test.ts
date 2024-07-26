import { isDefined, isNil } from '../helpers';

describe('isDefined', () => {
  it('returns true if value is present', () => {
    expect(isDefined(new Date())).toBeTruthy();
    expect(isDefined('')).toBeTruthy();
    expect(isDefined('string')).toBeTruthy();
    expect(isDefined(1)).toBeTruthy();
    expect(isDefined(0)).toBeTruthy();
    expect(isDefined(true)).toBeTruthy();
    expect(isDefined(false)).toBeTruthy();
    expect(isDefined([])).toBeTruthy();
    expect(isDefined([''])).toBeTruthy();
    expect(isDefined([0, 1])).toBeTruthy();
    expect(isDefined({})).toBeTruthy();
    expect(isDefined({ any: '' })).toBeTruthy();
  });

  it('returns false for undefined and null', () => {
    expect(isDefined(undefined)).toBeFalsy();
    expect(isDefined(null)).toBeFalsy();
  });
});

describe('isNil', () => {
  it('returns true if value is present', () => {
    expect(isNil(new Date())).toBeFalsy();
    expect(isNil('')).toBeFalsy();
    expect(isNil('string')).toBeFalsy();
    expect(isNil(1)).toBeFalsy();
    expect(isNil(0)).toBeFalsy();
    expect(isNil(true)).toBeFalsy();
    expect(isNil(false)).toBeFalsy();
    expect(isNil([])).toBeFalsy();
    expect(isNil([''])).toBeFalsy();
    expect(isNil([0, 1])).toBeFalsy();
    expect(isNil({})).toBeFalsy();
    expect(isNil({ any: '' })).toBeFalsy();
  });

  it('returns true for undefined and null', () => {
    expect(isNil(undefined)).toBeTruthy();
    expect(isNil(null)).toBeTruthy();
  });
});
