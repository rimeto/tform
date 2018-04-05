/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as _ from 'lodash';

export * from './utility';

// Define JSON interface.

export type JSONPrimitive = number | boolean | string | null;
export type JSONValue = JSONPrimitive | IJSONArray | IJSONRecord;

export interface IJSONArray extends Array<JSONValue> {}

export interface IJSONRecord {
  [key: string]: JSONValue;
}

function isPrimitive(obj: any): obj is JSONPrimitive {
  return obj === null || obj === undefined || ['string', 'number', 'boolean'].indexOf(typeof obj) >= 0;
}

// Define rules interface.

export type Rule<Record> = ((record: Record) => any) | IRulesInternal<Record>;

// Internal definition of IRules, not wrapped with `Defaultable`.
export interface IRulesInternal<Record> {
  [key: string]: Rule<Record>;
}

// Given a record, convert properties to methods that optionally take a fallback value.
// Note: Nested non-primitive properties are converted too.
function wrapRecord<Record extends object, Key extends keyof Record>(record: Record) {
  return new Proxy(record, {
    get(target: Record, name: Key): (fallback?: any) => Key {
      return (fallback: any) => {
        const returnValue = target[name] !== undefined ? target[name] : fallback;
        return isPrimitive(returnValue) ? returnValue : wrapRecord(returnValue);
      };
    },
  });
}

// Convert record into wrapped version as per `wrapRecord`.
export type Defaultable<Record> = { [key in keyof Record]: (fallback?: any) => Defaultable<Record[key]> };

// IRules wrapped by `Defaultable` suitable for public use.
export type IRules<Record> = IRulesInternal<Defaultable<Record>>;

// Define main classes.

export interface ITformError {
  error: Error;
  field?: string; // unset if record-level error instead of field-level error

  recordNo: number;
  recordRaw: IJSONRecord;
  recordId?: JSONValue; // unset if no `idKey` provided to `Tform` instance
}

// tslint:disable:member-ordering
export class Tform<Record> {
  private errors: ITformError[] = [];
  private recordCount: number = 0;

  constructor(private rules: IRules<Record>, private idKey?: string) {}

  // region Transformation methods.

  private processRules(rules: IRules<Record>, results: any, record: IJSONRecord) {
    Object.keys(rules).forEach((key: string) => {
      const rule = rules[key];

      try {
        if (_.isFunction(rule)) {
          // If the rule is function, wrap record and pass as an argument.
          const wrappedRecord = wrapRecord(record as any);
          results[key] = (rule as any)(wrappedRecord);
        } else {
          // Otherwise, the rule is a nested map of rules.
          results[key] = {};
          this.processRules(rule as IRules<Record>, results[key], record);
        }

        if (results[key] === undefined) {
          // noinspection ExceptionCaughtLocallyJS
          throw Error(`property '${key}' of result is undefined`);
        }

        if (_.isString(results[key])) {
          results[key] = results[key].trim();
        }
      } catch (e) {
        this.addError(e, record, key);
      }
    });
  }

  public transform(record: IJSONRecord): IJSONRecord {
    this.recordCount += 1;
    this.verifyHasID(record);

    const results: IJSONRecord = {};
    this.processRules(this.rules, results, record);
    return results;
  }

  // endregion

  // region Error-handling methods.

  public getErrors(): ITformError[] {
    return this.errors;
  }

  private verifyHasID(record: IJSONRecord) {
    if (this.idKey && !record[this.idKey]) {
      this.addError(TypeError(`Missing ID key '${this.idKey}'`), record);
    }
  }

  private extractID(record: IJSONRecord) {
    return this.idKey ? record[this.idKey] : undefined;
  }

  private addError(error: Error, record: IJSONRecord, field?: string) {
    this.errors.push({
      error,
      field,

      recordId: this.extractID(record),
      recordNo: this.recordCount,
      recordRaw: record,
    });
  }

  // endregion
}
