export type Optional<T, Key extends keyof T> = Omit<T, Key> & Partial<T>;

export interface GenerateIdOptions {
  type: 'identifier' | 'question' | 'token';
  length?: number;
  prefix?: number | string;
}
