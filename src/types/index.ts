export * from "./graphlink.js";

export type TrNode = {
  name: string;
  isType: (value: any) => boolean
  spread?: boolean;
}

export type TrLink = {
  inputType: string;
  outputType: string;
  name: string;
  transform: (value: any) => any;
}

export type ObjValue = bigint | string | number | boolean | null | undefined | ObjValue[] | { [key: string]: ObjValue }

export type Obj = Record<string, ObjValue>

export type TrSchemaValue<TLink extends string = string> = TLink[] | { [key: string]: TrSchemaValue<TLink> }

export type TrSchema<TLink extends string = string> = Record<string, TrSchemaValue<TLink>>