/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as _ from 'lodash';
import { oc, TSOCType } from 'ts-optchain';

export * from './utility';

/**
 * Tform rules definition given InRecord and OutRecord types.
 */
export type TformRules<InRecord, OutRecord> = {
  [K in keyof OutRecord]: OutRecord[K] extends object
    ? TformRules<InRecord, OutRecord[K]> | ((X: TSOCType<InRecord>) => OutRecord[K])
    : ((X: TSOCType<InRecord>) => OutRecord[K])
};

/**
 * Tform error
 */
export interface ITformError<InRecord> {
  error: Error;
  field?: string; // unset if record-level error instead of field-level error

  recordNo: number;
  recordRaw: InRecord;
  recordId?: string; // unset if no `idKey` provided to `Tform` instance
}

export class Tform<InRecord, OutRecord> {
  private currentSetOfAccesses = new Set<string | number | symbol>();
  private errors: Array<ITformError<InRecord>> = [];
  private keyMap: Map<string | number | symbol, Set<string | number | symbol>> = new Map<
    string | number | symbol,
    Set<string | number | symbol>
  >();
  private recordCount: number = 0;

  constructor(private rules: TformRules<InRecord, OutRecord>, private idKey?: keyof InRecord) {}

  private _processRules<T>(
    rules: TformRules<InRecord, T>,
    record: InRecord,
    wrappedRecord: ProxyHandler<any>,
  ): OutRecord {
    const results: any = {};
    for (const key in rules) {
      if (!rules.hasOwnProperty(key)) {
        continue;
      }

      const rule = rules[key];
      const ruleIsFunction = _.isFunction(rule);

      if (ruleIsFunction) {
        // Make sure not to overwrite an existing mapping due to recursive traversal of rules.
        const origSetFromMapKey = this.keyMap.get(key);
        if (origSetFromMapKey) {
          this.currentSetOfAccesses = origSetFromMapKey;
        }
      }

      try {
        // If rule is a function, call the rule function; otherwise traverse object.
        results[key] = _.isFunction(rule) ? rule(wrappedRecord) : this._processRules(rule, record, wrappedRecord);

        if (_.isString(results[key])) {
          results[key] = results[key].trim();
        }
      } catch (e) {
        this._addError(e, record, key);
      }

      if (ruleIsFunction) {
        const fixedSetOfAccesses = new Set(this.currentSetOfAccesses);
        this.keyMap.set(key, fixedSetOfAccesses);
        this.currentSetOfAccesses.clear();
      }
    }

    return results;
  }

  public transform(record: InRecord): OutRecord {
    this.recordCount += 1;
    this._verifyHasID(record);
    const traceableRecord = this._tracePropAccess(oc(record), this.currentSetOfAccesses);
    return this._processRules(this.rules, record, traceableRecord);
  }

  public getErrors(): Array<ITformError<InRecord>> {
    return this.errors;
  }

  public getKeyMapAfterTransform(): Map<string | number | symbol, Set<string | number | symbol>> {
    return this.keyMap;
  }

  private _verifyHasID(record: InRecord) {
    if (this.idKey && !record[this.idKey]) {
      this._addError(TypeError(`Missing ID key '${this.idKey}'`), record);
    }
  }

  private _extractID(record: InRecord) {
    return this.idKey && record[this.idKey] !== undefined ? `${record[this.idKey]}` : undefined;
  }

  private _addError(error: Error, record: InRecord, field?: string) {
    this.errors.push({
      error,
      field,

      recordId: this._extractID(record),
      recordNo: this.recordCount,
      recordRaw: record,
    });
  }

  private _tracePropAccess(obj: any, setOfAccesses: Set<string | number | symbol>) {
    return new Proxy(obj, {
      get(target, propKey, receiver) {
        setOfAccesses.add(propKey);
        return Reflect.get(target, propKey, receiver);
      },
    });
  }
}
