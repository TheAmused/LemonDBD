import type en from './en';

export type Dictionary = typeof en;
export type LocaleNamespace = keyof Dictionary;
