function isPrimitive(value: any) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "boolean";
}

function getObjValuePaths(
  obj: Record<string, any>,
  isValue: (value: any) => boolean = isPrimitive,
  startPath: string[] = []
): string[][] {
  const paths: string[][] = [];
  for (const key in obj) {
    const currentPath = [...startPath, key];
    const value = obj[key]!;
    if (isValue(value)) {
      paths.push(currentPath);
    } else if (value === null || typeof value !== "object") {
      continue;
    } else {
      getObjValuePaths(value, isValue, currentPath).forEach(path => paths.push(path));
    }
  }
  return paths;
}

function getObjValue<TOut = any>(obj: Record<string, any>, path: string[]): TOut {
  if (typeof obj !== "object" || obj === null) {
    throw new Error(`Object must not be primitive or null`);
  }
  let target: any = obj;
  for (let i = 0; i < path.length; i++) {
    const isLastElement = i === (path.length - 1);
    const key = path[i]!;
    target = target[key];
    if (!isLastElement && !target) {
      throw new Error(`Object ${JSON.stringify(obj)} has not value by path ${JSON.stringify(path)}`);
    }
  }
  return target;
}

function putObjValue<T extends Record<string, any> = Record<string, any>>(
  obj: T,
  path: string[],
  value: any
): T {
  if (typeof obj !== "object" || obj === null) {
    throw new Error(`Object must not be primitive or null`);
  }
  let target: any = obj;
  for (let i = 0; i < path.length; i++) {
    const isLastIndex = i === (path.length - 1);
    const key = path[i]!;
    if (!isLastIndex) {
      if (!target[key]) { target[key] = {}; }
      target = target[key];
    } else {
      target[key] = value;
    }
  }
  return obj;
}

export const objUtil = {
  getValuePaths: getObjValuePaths,
  getValue: getObjValue,
  putValue: putObjValue
};