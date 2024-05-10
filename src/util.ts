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

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getLeapYearCount(_first: number, _second: number): number {
  const first = _first > _second ? _second : _first;
  const second = _first > _second ? _first : _second;
  let count = 0;
  let yearPoint = second;
  while (!isLeapYear(yearPoint) && yearPoint !== first) {
    yearPoint -= 1;
  }
  if (isLeapYear(yearPoint)) {
    for (let i = yearPoint; i >= first; i -= 4) {
      if (isLeapYear(i)) count++;
    }
    return count;
  }
  return 0;
}

export function getDaysCountBeforeMonthInYear(monthNumber: number, isLeapYear?: boolean): number {
  if (monthNumber < 0 || monthNumber > 12) throw new Error(
    `Invalid month number. Month number: ${monthNumber}`
  );
  const monthDayMap = new Map<number, number>([
    [0, 0],
    [1, 31],
    [2, isLeapYear ? 29 : 28],
    [3, 31],
    [4, 30],
    [5, 31],
    [6, 30],
    [7, 31],
    [8, 31],
    [9, 30],
    [10, 31],
    [11, 30],
  ]);
  let count = 0;
  for (let i = 0; i < monthNumber; i++) {
    const daysCount = monthDayMap.get(i);
    if (daysCount !== 0 && !daysCount) throw new Error(
      `Invalid month number. Month number: ${monthNumber}`
    );
    count += daysCount;
  }
  return count;
}

export function getDaysCountBetweenDates(from: Date, to: Date): number {
  if (from.getTime() > to.getTime()) {
    return getDaysCountBetweenDates(to, from);
  }
  const countDaysToYear = getDaysCountBeforeMonthInYear(
    to.getUTCMonth() + 1,
    isLeapYear(to.getUTCFullYear())
  ) + to.getUTCDate();
  const _leapYearCount = getLeapYearCount(from.getUTCFullYear(), to.getUTCFullYear());
  const leapYearCount = isLeapYear(to.getUTCFullYear())
    ? _leapYearCount - 1
    : _leapYearCount;
  const yearsDifInDays = ((to.getUTCFullYear() - from.getUTCFullYear()) * 365) + leapYearCount;
  const countDaysFromYear = getDaysCountBeforeMonthInYear(
    from.getUTCMonth() + 1,
    isLeapYear(from.getUTCFullYear())
  ) + from.getUTCDate();
  return countDaysToYear + yearsDifInDays - countDaysFromYear;
}