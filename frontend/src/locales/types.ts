// frontend/src/locales/types.ts
import type en from './en';

export type DeepString<T> = T extends (...args: any[]) => any
    ? T
    : T extends readonly (infer U)[]
    ? readonly DeepString<U>[]
    : T extends (infer U)[]
    ? DeepString<U>[]
    : T extends object
    ? { [K in keyof T]: DeepString<T[K]> }
    : string;

export type Dictionary = DeepString<typeof en>;
export type Locale = 'en' | 'es' | 'pl' | 'de' | 'ja';