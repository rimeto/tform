/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { RecordProxy } from '../RecordProxy';

describe('RecordProxy', () => {
  it('fetches value from known field', () => {
    const proxy = RecordProxy({ key: 'value' });
    expect(proxy.key()).toEqual('value');
  });

  it('returns undefined from unknown field', () => {
    const proxy = RecordProxy({ key: 'value' });
    expect((proxy as any).unknown()).toEqual(undefined);
  });

  it('returns default value from undefined field', () => {
    const record: { key?: string } = {};
    const proxy = RecordProxy(record);
    expect(proxy.key('default value')).toEqual('default value');
  });

  it('performs deep object traversal', () => {
    const proxy = RecordProxy({ a: { b: { c: 'hello world' } } });
    expect(proxy.a.b.c()).toEqual('hello world');
  });

  it('performs deep array traversal', () => {
    const proxy = RecordProxy([[[{ a: 'hello world' }]]]);
    expect(proxy[0][0][0].a()).toEqual('hello world');
  });

  it('performs array operations', () => {
    const proxy = RecordProxy([{ a: 'hello' }, { a: 'world' }]);
    expect(proxy.map((v) => v.a())).toEqual(['hello', 'world']);
  });
});
