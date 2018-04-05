/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function splitList(delimiter: string, value: string): string[] {
  return value
    .split(delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function wrapList(obj: any) {
  return obj ? [obj] : [];
}
