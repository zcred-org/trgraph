import * as u8a from "uint8arrays";
import ieee754 from "ieee754";
import { TrLink, TrNode, TrSchema } from "./types/index.js";
import { ISO3166 } from "./iso3166.js";
import { getDaysCountBetweenDates, objUtil } from "./util.js";

const MS_FROM_1900_TO_1970 = 2208988800000;

function isStr(encoding: u8a.SupportedEncodings) {
  return (value: any) => {
    const isstr = typeof value === "string";
    let result = true;
    try {
      u8a.fromString(value, encoding);
    } catch (e) {
      result = false;
    }
    return isstr && result;
  };
}

function isUint(num: number) {
  const bignum = BigInt(num);
  const max = 2n ** bignum - 1n;
  return (value: any): boolean => {
    if (typeof value === "number" || typeof value === "bigint") {
      const targetNum = typeof value === "number" ? BigInt(value) : value;
      return 0n <= targetNum && targetNum <= max;
    }
    return false;
  };
}

function isInt(num: number) {
  const bignum = BigInt(num);
  const max = ((2n ** bignum) / 2n) - 1n;
  const min = -((2n ** bignum) / 2n);
  return (value: any): boolean => {
    if (typeof value === "number" || typeof value === "bigint") {
      const targetNum = typeof value === "number" ? BigInt(value) : value;
      return min <= targetNum && targetNum <= max;
    }
    return false;
  };
}

export const BASE_NODES: Record<string, TrNode> = {
  utf8: {
    name: "utf8",
    isType: isStr("utf-8")
  },
  base64: {
    name: "base64",
    isType: isStr("base64")
  },
  base32: {
    name: "base32",
    isType: isStr("base32upper")
  },
  base16: {
    name: "base16",
    isType: isStr("base16upper")
  },
  hex: {
    name: "hex",
    isType: isStr("hex")
  },
  base64url: {
    name: "base64url",
    isType: isStr("base64url")
  },
  base58: {
    name: "base58",
    isType: isStr("base58btc")
  },
  ascii: {
    name: "ascii",
    isType: isStr("ascii")
  },
  uint16: {
    name: "uint16",
    isType: isUint(16)
  },
  uint32: {
    name: "uint32",
    isType: isUint(32)
  },
  uint64: {
    name: "uint64",
    isType: isUint(64)
  },
  uint128: {
    name: "uint128",
    isType: isUint(128)
  },
  uint256: {
    name: "uint256",
    isType: isUint(256)
  },
  int16: {
    name: "int16",
    isType: isInt(16)
  },
  int32: {
    name: "int32",
    isType: isInt(32)
  },
  int64: {
    name: "int64",
    isType: isInt(64)
  },
  int128: {
    name: "int128",
    isType: isInt(128)
  },
  int256: {
    name: "int256",
    isType: isInt(256)
  },
  float32: {
    name: "float32",
    isType: (value: any) => typeof value === "number"

  },
  boolean: {
    name: "boolean",
    isType: (value: any) => typeof value === "boolean"
  },
  bytes: {
    name: "bytes",
    spread: true,
    isType: (value: any) => value instanceof Uint8Array
  },
  uint: {
    name: "uint",
    isType: (value: any) => {
      if (typeof value === "number") {
        return value >= 0 && Number.isInteger(value);
      }
      return typeof value === "bigint" && value >= 0n;
    }
  },
  isodate: {
    name: "isodate",
    isType: (value: any) => {
      try {
        if (typeof value !== "string") return false;
        new Date(value);
        return true;
      } catch (e) {
        return false;
      }
    }
  },
  unixtime: {
    name: "unixtime",
    isType: (value: any) => {
      try {
        return typeof value === "bigint" || typeof value === "number";
      } catch (e) {
        return false;
      }
    }
  },
  unixtime19: {
    name: "unixtime19",
    isType: (value: any) => {
      try {
        return typeof value === "bigint" || typeof value === "number";
      } catch (e) {
        return false;
      }
    }
  },
  iso3166numeric: {
    name: "iso3166numeric",
    isType: (value: unknown) => {
      try {
        if (typeof value !== "number" && typeof value !== "bigint") return false;
        return ISO3166.isNumeric(parseInt(value.toString()));
      } catch (e) {
        return false;
      }
    }
  },
  iso3166alpha2: {
    name: "iso3166alpha2",
    isType: (value: unknown) => {
      try {
        return typeof value === "string" && ISO3166.isAlpha2(value);
      } catch (e) {
        return false;
      }
    }
  },
  iso3166alpha3: {
    name: "iso3166alpha3",
    isType: (value: unknown) => {
      try {
        return typeof value === "string" && ISO3166.isAlpha3(value);
      } catch (e) {
        return false;
      }
    }
  },
  "0xhex": {
    name: "0xhex",
    isType: (value: unknown) => {
      try {
        if (typeof value === "string" && value.startsWith("0x")) {
          u8a.fromString(value.replace("0x", ""));
          return true;
        }
        return false;
      } catch (e) {
        return false;
      }
    }
  },
  "bytesdate": {
    name: "bytesdate",
    isType: (value: unknown) => value instanceof Uint8Array
  },
};

function defaultLinks(): Record<string, TrLink> {
  return Object
    .keys(BASE_NODES)
    .reduce((prev, current) => {
      if (
        current.startsWith("int") ||
        current.startsWith("uint") ||
        current.startsWith("iso3166numeric") ||
        current.startsWith("unixtime") ||
        current.startsWith("unixtime19")
      ) {
        prev[current] = {
          inputType: current,
          outputType: current,
          name: current,
          transform: value => BigInt(value)
        };
      } else {
        prev[current] = {
          inputType: current,
          outputType: current,
          name: current,
          transform: value => value
        };
      }
      return prev;
    }, {} as Record<string, TrLink>);
}

function toBigInt(bytes: Uint8Array): bigint {
  const reversedBytes = bytes.reverse();
  let result = BigInt(0);
  for (let i = reversedBytes.length - 1; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]!);
  }
  return result;
}

function numToBytes(num: number | bigint): Uint8Array {
  let target = typeof num === "number" ? BigInt(num) : num;
  if (num === 0) return new Uint8Array([0]);
  const bytes: number[] = [];
  let count = 0;
  while (target !== 0n) {
    bytes[count] = Number(target % 256n);
    count++;
    target = target / 256n;
  }
  return new Uint8Array(bytes.reverse());
}

export const UINTS_MAP: Record<string, {
  max: bigint | null,
  numBytes: number | null,
  order: bigint | null
}> = {
  uint: { max: null, numBytes: null, order: null },
  unixtime19: { max: null, numBytes: null, order: null },
  unixtime: { max: null, numBytes: null, order: null },
  uint16: { max: 2n ** 16n - 1n, numBytes: 2, order: 2n ** 16n },
  uint32: { max: 2n ** 32n - 1n, numBytes: 4, order: 2n ** 32n },
  uint64: { max: 2n ** 64n - 1n, numBytes: 8, order: 2n ** 64n },
  uint128: { max: 2n ** 128n - 1n, numBytes: 16, order: 2n ** 128n },
  uint256: { max: 2n ** 128n - 1n, numBytes: 32, order: 2n ** 256n }
};


function uintToBytes(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  for (const uintName in UINTS_MAP) {
    const uint = UINTS_MAP[uintName]!;
    result[`${uintName}-bytes`] = {
      name: `${uintName}-bytes`,
      inputType: uintName,
      outputType: "bytes",
      transform: (value: number | bigint): Uint8Array => {
        const bytes = numToBytes(value);
        if (uint.numBytes && uint.numBytes > bytes.length) {
          const zeroes = new Array<number>(uint.numBytes - bytes.length).fill(0);
          return new Uint8Array([...zeroes, ...bytes]);
        } else if (uint.numBytes && uint.numBytes < bytes.length) {
          throw new Error(`Transformation Graph: link ${uintName}-bytes, throw error because bytes length more than max bytes length ${uint.numBytes}`);
        }
        return bytes;
      }
    };
  }
  return result;
}

function bytesToUint(): Record<string, TrLink> {
  return Object.keys(UINTS_MAP).reduce((prev, name) => {
    prev[`bytes-${name}`] = {
      inputType: "bytes",
      outputType: name,
      name: `bytes-${name}`,
      transform: toBigInt
    };
    return prev;
  }, {} as Record<string, TrLink>);
}

export const INTS_MAP: Record<string, { num: number, bnum: bigint }> = {
  int16: { num: 16, bnum: 16n },
  int32: { num: 32, bnum: 32n },
  int64: { num: 64, bnum: 64n },
  int128: { num: 128, bnum: 128n },
  int256: { num: 256, bnum: 256n }
};

function bytesToInt(): Record<string, TrLink> {
  return Object.keys(INTS_MAP)
    .reduce((prev, name) => {
      prev[`bytes-${name}`] = {
        inputType: "bytes",
        outputType: name,
        name: name,
        transform: (bytes: Uint8Array) => {
          const nBits = INTS_MAP[name]!;
          if (bytes.length > nBits.num / 8) {
            throw new Error(`Graph transformation bytes-${name} error, more then ${nBits.num} bits`);
          }
          const max = ((2n ** nBits.bnum) / 2n) - 1n;
          const target = toBigInt(bytes);
          return target > max ? -(target - max) : target;
        }
      };
      return prev;
    }, {} as Record<string, TrLink>);
}

function intsToBytes(): Record<string, TrLink> {
  return Object.keys(INTS_MAP)
    .reduce((prev, name) => {
      prev[`${name}-bytes`] = {
        inputType: name,
        outputType: "bytes",
        name: `${name}-bytes`,
        transform: (value: number | bigint): Uint8Array => {
          const num = typeof value === "number" ? BigInt(value) : value;
          const nBits = INTS_MAP[name]!;
          const max = ((2n ** nBits.bnum) / 2n) - 1n;
          const target = num < 0 ? max + (-num) : num;
          return numToBytes(target);
        }
      };
      return prev;
    }, {} as Record<string, TrLink>);
}

const ENC_ALIASES: Record<string, u8a.SupportedEncodings> = {
  "isodate": "ascii",
  "utf8": "utf8",
  "base64": "base64",
  "base64url": "base64url",
  "base32": "base32upper",
  "base16": "base16upper",
  "base58": "base58btc",
  "ascii": "ascii",
  "hex": "hex"
};

function bytesToString(): Record<string, TrLink> {
  return Object.keys(ENC_ALIASES)
    .reduce((prev, name) => {
      const encoding = ENC_ALIASES[name]!;
      prev[`bytes-${name}`] = {
        inputType: "bytes",
        outputType: name,
        name: `bytes-${name}`,
        transform: (bytes: Uint8Array) => u8a.toString(bytes, encoding)
      };
      return prev;
    }, {} as Record<string, TrLink>);
}

function stringToBytes(): Record<string, TrLink> {
  return Object.keys(ENC_ALIASES)
    .reduce((prev, name) => {
      const encoding = ENC_ALIASES[name]!;
      prev[`${name}-bytes`] = {
        inputType: name,
        outputType: "bytes",
        name: `${name}-bytes`,
        transform: (str: string) => u8a.fromString(str, encoding)
      };
      return prev;
    }, {} as Record<string, TrLink>);
}

function stringsToBoolean(): Record<string, TrLink> {
  return [
    "utf8",
    "ascii"
  ].reduce((prev, name) => {
    prev[`${name}-boolean`] = {
      inputType: name,
      outputType: "boolean",
      name: `${name}-boolean`,
      transform: (str: string) => {
        if (str === "true" || str === "false") {
          return str === "true";
        }
        throw new Error(`For graph link ${name}-boolean value must to be "true" or "false"`);
      }
    };
    return prev;
  }, {} as Record<string, TrLink>);
}

function booleanToStrings(): Record<string, TrLink> {
  return [
    "utf8",
    "ascii"
  ].reduce((prev, name) => {
    prev[`boolean-${name}`] = {
      inputType: "boolean",
      outputType: name,
      name: `boolean-${name}`,
      transform: (bool: boolean): string => bool ? "true" : "false"
    };
    return prev;
  }, {} as Record<string, TrLink>);
}

function booleanToNumbers(): Record<string, TrLink> {
  return Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP))
    .reduce((prev, name) => {
      prev[`boolean-${name}`] = {
        inputType: "boolean",
        outputType: name,
        name: `boolean-${name}`,
        transform: (bool: boolean): bigint => bool ? 1n : 0n
      };
      return prev;
    }, {} as Record<string, any>);
}

function numbersToBoolean(): Record<string, TrLink> {
  return Object.keys(UINTS_MAP)
    .concat(Object.keys(INTS_MAP))
    .reduce((prev, name) => {
      prev[`${name}-boolean`] = {
        inputType: name,
        outputType: "boolean",
        name: `${name}-boolean`,
        transform: (num: bigint | number): boolean => {
          const target = typeof num === "number" ? BigInt(num) : num;
          if (target === 1n || target === 0n) {
            return target === 1n;
          }
          throw new Error(`For graph link ${name}-boolean ${name} value must be 0 or 1`);
        }
      };
      return prev;
    }, {} as Record<string, TrLink>);
}

function stringsToNumbers(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  ["utf8", "ascii"].forEach((strName) => {
    Object.keys(UINTS_MAP)
      .concat(Object.keys(INTS_MAP))
      .forEach((numName) => {
        result[`${strName}-${numName}`] = {
          inputType: strName,
          outputType: numName,
          name: `${strName}-${numName}`,
          transform: (str: string): bigint => BigInt(str)
        };
      });
  });
  return result;
}

function numbersToStrings(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  ["utf8", "ascii"].forEach((strName) => {
    Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP))
      .forEach((numName) => {
        result[`${numName}-${strName}`] = {
          inputType: numName,
          outputType: strName,
          name: `${numName}-${strName}`,
          transform: (value: bigint | number): string => {
            const target = typeof value === "number" ? BigInt(value) : value;
            return target.toString();
          }
        };
      });
  });
  return result;
}

function stringsToFloat(): Record<string, TrLink> {
  return ["utf8", "ascii"].reduce((prev, name) => {
    prev[`${name}-float32`] = {
      inputType: name,
      outputType: "float32",
      name: `${name}-float32`,
      transform: (str: string): number => parseFloat(str)
    };
    return prev;
  }, {} as Record<string, TrLink>);
}

function floatToStrings(): Record<string, TrLink> {
  return ["utf8", "ascii"].reduce((prev, name) => {
    prev[`float32-${name}`] = {
      inputType: "float32",
      outputType: name,
      name: `float32-${name}`,
      transform: (num: number) => String(num)
    };
    return prev;
  }, {} as Record<string, TrLink>);
}

function modUints(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  for (const key in UINTS_MAP) {
    const { order: divisor } = UINTS_MAP[key as keyof typeof UINTS_MAP]!;
    if (!divisor) continue;
    result[`mod.${key}`] = {
      inputType: "uint",
      outputType: key,
      name: `mod.${key}`,
      transform: (value: number | bigint): bigint => {
        const target = typeof value === "number" ? BigInt(value) : value;
        return target % divisor;
      }
    };
  }
  return result;
}

function unixToNums(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  const nums = Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP));
  for (const unix of ["unixtime", "unixtime19"]) {
    for (const num of nums) {
      result[`${unix}-${num}`] = {
        inputType: unix,
        outputType: num,
        name: `${unix}-${num}`,
        transform: (value: bigint) => BigInt(value)
      };
    }
  }
  return result;
}

function numsToUnix(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  const nums = Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP));
  for (const unix of ["unixtime", "unixtime19"]) {
    for (const num of nums) {
      result[`${num}-${unix}`] = {
        inputType: num,
        outputType: unix,
        name: `${num}-${unix}`,
        transform: (value: bigint) => BigInt(value)
      };
    }
  }
  return result;
}

function iso3166AlphaToStrs(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  for (const alpha of ["iso3166alpha2", "iso3166alpha3"]) {
    for (const str of ["utf8", "ascii"]) {
      result[`${alpha}-${str}`] = {
        inputType: alpha,
        outputType: str,
        name: `${alpha}-${str}`,
        transform: (value: string) => value
      };
    }
  }
  return result;
}

function strsToISO3166Alpha(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  for (const alpha of ["iso3166alpha2", "iso3166alpha3"]) {
    for (const str of ["utf8", "ascii"]) {
      result[`${str}-${alpha}`] = {
        inputType: str,
        outputType: alpha,
        name: `${str}-${alpha}`,
        transform: (value: string) => value
      };
    }
  }
  return result;
}

function iso3166NumericToNums(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  const nums = Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP));
  for (const num of nums) {
    result[`iso3166numeric-${num}`] = {
      inputType: "iso3166numeric",
      outputType: num,
      name: `iso3166numeric-${num}`,
      transform: (value: number | bigint) => BigInt(value)
    };
  }
  return result;
}

function numsToIso3166Numeric(): Record<string, TrLink> {
  const result: Record<string, TrLink> = {};
  const nums = Object.keys(UINTS_MAP).concat(Object.keys(INTS_MAP));
  for (const num of nums) {
    result[`${num}-iso3166numeric`] = {
      inputType: num,
      outputType: "iso3166numeric",
      name: `${num}-iso3166numeric`,
      transform: (value: number | bigint) => BigInt(value)
    };
  }
  return result;
}

// TODO: add ISO3166 transformations
// TODO: add Types

export const BASE_LINKS: Record<string, TrLink> = {
  ...defaultLinks(),
  ...bytesToUint(),
  ...uintToBytes(),
  ...bytesToInt(),
  ...intsToBytes(),
  ...bytesToString(),
  ...stringToBytes(),
  ...stringsToBoolean(),
  ...booleanToStrings(),
  ...booleanToNumbers(),
  ...numbersToBoolean(),
  ...stringsToNumbers(),
  ...numbersToStrings(),
  ...stringsToFloat(),
  ...floatToStrings(),
  ...modUints(),
  ...unixToNums(),
  ...numsToUnix(),
  ...iso3166AlphaToStrs(),
  ...strsToISO3166Alpha(),
  ...iso3166NumericToNums(),
  ...numsToIso3166Numeric(),
  "ascii-isodate": {
    inputType: "ascii",
    outputType: "isodate",
    name: "ascii-isodate",
    transform: (value: string) => value
  },
  "utf8-isodate": {
    inputType: "utf8",
    outputType: "isodate",
    name: "utf8-isodate",
    transform: (value: string) => value
  },
  "bytes-float32": {
    inputType: "bytes",
    outputType: "float32",
    name: "bytes-float32",
    transform: (bytes: Uint8Array): number => {
      return ieee754.read(bytes, 0, true, 23, 4);
    }
  },
  "float32-bytes": {
    inputType: "float32",
    outputType: "bytes",
    name: "float32-bytes",
    transform: (num: number) => {
      const bytes = new Uint8Array(4);
      ieee754.write(bytes, num, 0, true, 23, 4);
      return bytes;
    }
  },
  "isodate-utf8": {
    inputType: "isodate",
    outputType: "utf8",
    name: "isodate-utf8",
    transform: (value: string) => value
  },
  "isodate-ascii": {
    inputType: "isodate",
    outputType: "ascii",
    name: "isodate-ascii",
    transform: (value: string) => value
  },
  "isodate-unixtime": {
    inputType: "isodate",
    outputType: "unixtime",
    name: "isodate-unixtime",
    transform: (value: string) => {
      return BigInt(new Date(value).getTime());
    },
  },
  "isodate-unixtime19": {
    inputType: "isodate",
    outputType: "unixtime19",
    name: "isodate-unixtime19",
    transform: (value: string) => {
      return BigInt(new Date(value).getTime() + MS_FROM_1900_TO_1970);
    }
  },
  "unixtime-isodate": {
    inputType: "unixtime",
    outputType: "isodate",
    name: "unixtime-isodate",
    transform: (value: bigint | number) => {
      return new Date(parseInt(value.toString())).toISOString();
    }
  },
  "unixtime-unixtime19": {
    inputType: "unixtime",
    outputType: "unixtime19",
    name: "unixtime-unixtime19",
    transform: (value: bigint | number) => {
      return BigInt(value) + BigInt(MS_FROM_1900_TO_1970);
    }
  },
  "unixtime19-isodate": {
    inputType: "unixtime19",
    outputType: "isodate",
    name: "unixtime19-isodate",
    transform: (value: bigint | number) => {
      const unixtime = (BigInt(value) - BigInt(MS_FROM_1900_TO_1970)).toString();
      return new Date(parseInt(unixtime)).toISOString();
    }
  },
  "unixtime19-unixtime": {
    inputType: "unixtime19",
    outputType: "unixtime",
    name: "unixtime19-unixtime",
    transform: (value: bigint | number) => {
      return BigInt(value) - BigInt(MS_FROM_1900_TO_1970);
    }
  },
  "iso3166numeric-iso3166alpha2": {
    inputType: "iso3166numeric",
    outputType: "iso3166alpha2",
    name: "iso3166numeric-iso3166alpha2",
    transform: (value: number | bigint) => {
      try {
        return ISO3166.getAlpha2(value.toString());
      } catch (e) {
        throw e;
      }
    }
  },
  "iso3166numeric-iso3166alpha3": {
    inputType: "iso3166numeric",
    outputType: "iso3166alpha3",
    name: "iso3166numeric-iso3166alpha3",
    transform: (value: number | bigint) => {
      try {
        return ISO3166.getAlpha3(value.toString());
      } catch (e) {
        throw e;
      }
    }
  },
  "iso3166alpha2-iso3166numeric": {
    inputType: "iso3166alpha2",
    outputType: "iso3166numeric",
    name: "iso3166alpha2-iso3166numeric",
    transform: (value: string) => {
      try {
        return BigInt(ISO3166.getNumeric(value));
      } catch (e) { throw e;}
    }
  },
  "iso3166alpha3-iso3166numeric": {
    inputType: "iso3166alpha3",
    outputType: "iso3166numeric",
    name: "iso3166alpha3-iso3166numeric",
    transform: (value: string) => {
      try {
        return BigInt(ISO3166.getNumeric(value));
      } catch (e) { throw e; }
    }
  },
  "0xhex-bytes": {
    inputType: "0xhex",
    outputType: "bytes",
    name: "0xhex-bytes",
    transform: (value: string) => {
      try {
        return u8a.fromString(value.replace("0x", ""), "hex");
      } catch (e) {throw e;}
    }
  },
  "bytes-0xhex": {
    inputType: "bytes",
    outputType: "0xhex",
    name: "bytes-0xhex",
    transform: (value: Uint8Array) => {
      try {
        return `0x${u8a.toString(value, "hex")}`;
      } catch (e) { throw e;}
    }
  },
  "isodate-bytesdate": {
    inputType: "isodate",
    outputType: "bytesdate",
    name: "isodate-bytesdate",
    transform: (value: string) => {
      try {
        const date = new Date(value);
        const _ms = numToBytes(date.getUTCMilliseconds());
        const ms = _ms.length === 1 ? new Uint8Array([0, ..._ms]) : _ms;
        const sec = numToBytes(date.getUTCSeconds());
        const min = numToBytes(date.getUTCMinutes());
        const hour = numToBytes(date.getUTCHours());
        const day = numToBytes(date.getUTCDate());
        const month = numToBytes(date.getUTCMonth() + 1);
        const year = numToBytes(date.getUTCFullYear());
        return new Uint8Array([...year, ...month, ...day, ...hour, ...min, ...sec, ...ms]);
      } catch (e) {throw e;}
    }
  },
  "bytesdate-isodate": {
    inputType: "bytesdate",
    outputType: "isodate",
    name: "bytesdate-isodate",
    transform: (value: number[] | Uint8Array) => {
      const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
      const lastInx = bytes.length - 1;
      const _ms = toBigInt((bytes.slice(lastInx - 1))).toString();
      const ms = getZeroesStr(3 - _ms.length) + _ms;
      const _sec = toBigInt(bytes.slice(lastInx - 2, lastInx - 1)).toString();
      const sec = getZeroesStr(2 - _sec.length) + _sec;
      const _min = toBigInt(bytes.slice(lastInx - 3, lastInx - 2)).toString();
      const min = getZeroesStr(2 - _min.length) + _min;
      const _hour = toBigInt(bytes.slice(lastInx - 4, lastInx - 3)).toString();
      const hour = getZeroesStr(2 - _hour.length) + _hour;
      const _day = toBigInt(bytes.slice(lastInx - 5, lastInx - 4)).toString();
      const day = getZeroesStr(2 - _day.length) + _day;
      const _month = toBigInt(bytes.slice(lastInx - 6, lastInx - 5)).toString();
      const month = getZeroesStr(2 - _month.length) + _month;
      const _year = toBigInt(bytes.slice(0, lastInx - 6)).toString();
      const year = getZeroesStr(4 - _year.length) + _year;
      return `${year}-${month}-${day}T${hour}:${min}:${sec}.${ms}Z`;
    }
  },
  "bytesdate-unixtime": {
    inputType: "bytesdate",
    outputType: "unixtime",
    name: "bytesdate-unixtime",
    transform: (value: number[] | Uint8Array): bigint => {
      return bytesDateToUnixTime(value);
    }
  },
  "bytesdate-unixtime19": {
    inputType: "bytesdate",
    outputType: "unixtime19",
    name: "bytesdate-unixtime19",
    transform: (value: number[] | Uint8Array): bigint => {
      return bytesDateToUnixTime(value) + BigInt(MS_FROM_1900_TO_1970);
    }
  },
  "bytesdate-bytes": {
    inputType: "bytesdate",
    outputType: "bytes",
    name: "bytesdate-bytes",
    transform: (value: number[] | Uint8Array): Uint8Array => {
      return value instanceof Uint8Array ? value : new Uint8Array(value);
    }
  },
  "bytes-bytesdate": {
    inputType: "bytes",
    outputType: "bytesdate",
    name: "bytes-bytesdate",
    transform: (value: number[] | Uint8Array): Uint8Array => {
      return value instanceof Uint8Array ? value : new Uint8Array(value);
    }
  }
};

function bytesDateToUnixTime(value: Uint8Array | number[]): bigint {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const lastInx = bytes.length - 1;
  const ms = toBigInt((bytes.slice(lastInx - 1)));
  const sec = toBigInt(bytes.slice(lastInx - 2, lastInx - 1));
  const min = toBigInt(bytes.slice(lastInx - 3, lastInx - 2));
  const hour = toBigInt(bytes.slice(lastInx - 4, lastInx - 3));
  const day = toBigInt(bytes.slice(lastInx - 5, lastInx - 4));
  const month = toBigInt(bytes.slice(lastInx - 6, lastInx - 5));
  const year = toBigInt(bytes.slice(0, lastInx - 6));

  const yearStr = getZeroesStr(4 - year.toString().length) + year.toString();
  const monthStr = getZeroesStr(2 - month.toString().length) + month.toString();
  const dayStr = getZeroesStr(2 - day.toString().length) + day.toString();
  const hourStr = getZeroesStr(2 - hour.toString().length) + hour.toString();
  const minStr = getZeroesStr(2 - min.toString().length) + min.toString();
  const secStr = getZeroesStr(2 - sec.toString().length) + sec.toString();
  const msStr = getZeroesStr(3 - ms.toString().length) + ms.toString();

  const date1970 = new Date(`1970-01-01T00:00:00.000Z`);
  const dateTarget = new Date(`${yearStr}-${monthStr}-${dayStr}T${hourStr}:${minStr}:${secStr}.${msStr}Z`);
  const daysCount = getDaysCountBetweenDates(date1970, dateTarget);

  const msSum = (hour * BigInt(60 * 60 * 1000)) +
    (min * BigInt(60 * 1000)) +
    (sec * BigInt(1000)) +
    ms;
  return (
    dateTarget.getTime() >= date1970.getTime()
      ? (BigInt(daysCount) * BigInt(24 * 3600 * 1000))
      : (-BigInt(daysCount) * BigInt(24 * 3600 * 1000))
  ) + msSum;
}

function getZeroesStr(length: number): string {
  if (length < 0) return "";
  return Array(length).fill("0").join("");
}

export class TrGraph {

  private readonly nodes = { ...BASE_NODES };
  private readonly links = { ...BASE_LINKS };

  extend(nodes: TrNode[], links: TrLink[]): void {
    nodes.forEach(node => {
      if (this.nodes[node.name]) {
        throw new Error(`Node with name "${node.name}" already exists in transformation graph`);
      }
      this.nodes[node.name] = node;
    });
    links.forEach((link) => {
      if (this.links[link.name]) {
        throw new Error(`Link with name "${link.name}" already exists in transformation graph`);
      }
      this.links[link.name] = link;
    });
  }

  transform<TOut = any, TIn = any>(value: TIn, links: string[]): TOut {
    let result: any = value;
    links.forEach((link) => {
      const targetLink = this.links[link];
      if (!targetLink) {
        throw new Error(`${link} link is not supported by Transformation Graph`);
      }
      const { inputType, outputType, transform } = targetLink;
      const input = this.nodes[inputType];
      if (!input) throw new Error(`Transformation graph: node with name ${inputType} not supported`);
      const output = this.nodes[outputType];
      if (!output) throw new Error(`Transformation graph: node with name ${outputType} not supported`);

      if (!input.isType(result)) {
        throw new Error(`Invalid transformation, input type ${input.name} is not matched to value = ${result}`);
      }
      result = transform(result);
      if (!output.isType(result)) {
        throw new Error(`Invalid transformation, output type ${output.name} is not matched to value = ${result}`);
      }
    });
    return result;
  }

  objectTransform<
    TTr extends Record<string, any> = Record<string, any>,
    TLin extends any[] = any[]
  >(
    obj: Record<string, any>,
    trSchema: TrSchema
  ): {
    transformed: TTr,
    linear: TLin
  } {
    const paths = objUtil.getValuePaths(trSchema, (value) => {
      const isAllString = (arr: any[]) => arr.filter((it) => typeof it === "string").length === arr.length;
      return Array.isArray(value) && isAllString(value);
    });
    const target = {};
    const liner = [];
    for (const path of paths) {
      const trLinks = objUtil.getValue<string[]>(trSchema, path);
      const value = objUtil.getValue<unknown>(obj, path);
      const transformed = this.transform(value, trLinks);
      // object representation
      objUtil.putValue(target, path, transformed);
      // liner representation
      if (this.getLastNode(trLinks).spread) {
        transformed.forEach((it: any) => liner.push(it));
      } else {
        liner.push(transformed);
      }
    }
    return {
      transformed: target as TTr,
      linear: liner as TLin
    };
  }

  getLastNode(links: string[]): TrNode {
    const lastLink = links[links.length - 1]!;
    const lastType = this.links[lastLink]!.outputType;
    const result = this.nodes[lastType];
    if (result) return result;
    throw new Error();
  }

}
