import { IAuthConfig } from './auth-config';

export type AuthSchema = Record<
  string,
  Record<string, Record<string, IAuthConfig> | IAuthConfig>
>;
