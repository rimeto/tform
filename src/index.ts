/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as _ from 'lodash';
import { oc, OCType } from 'ts-optchain';

export * from './utility';

/**
 * Tform rules definition given InRecord and OutRecord types.
 */
export type TformRules<InRecord, OutRecord> = {
  [K in keyof OutRecord]: OutRecord[K] extends object
    ? TformRules<InRecord, OutRecord[K]> | ((X: OCType<InRecord>) => OutRecord[K])
    : ((X: OCType<InRecord>) => OutRecord[K])
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
  private errors: Array<ITformError<InRecord>> = [];
  private recordCount: number = 0;

  constructor(private rules: TformRules<InRecord, OutRecord>, private idKey?: keyof InRecord) {}

  private _processRules<T>(rules: TformRules<InRecord, T>, record: InRecord): OutRecord {
    const results: any = {};
    for (const key in rules) {
      if (!rules.hasOwnProperty(key)) {
        continue;
      }

      const rule = rules[key];
      try {
        // If rule is a function, call the rule function; otherwise traverse object.
        results[key] = _.isFunction(rule) ? rule(oc(record)) : this._processRules(rule, record);

        if (_.isString(results[key])) {
          results[key] = results[key].trim();
        }
      } catch (e) {
        this._addError(e, record, key);
      }
    }

    return results;
  }

  public transform(record: InRecord): OutRecord {
    this.recordCount += 1;
    this._verifyHasID(record);
    return this._processRules(this.rules, record);
  }

  public getErrors(): Array<ITformError<InRecord>> {
    return this.errors;
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
}
