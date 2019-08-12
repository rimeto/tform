/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { splitList, Tform, TformRules } from '../index';

describe('tform', () => {
  test('basic transforming', () => {
    interface IPerson {
      job: string;
      name: {
        first: string;
        last: string;
      };
      age: number;
      hobbies: string[];
      address: {
        home: string;
        work: string;
      };
    }

    interface IRawRecord {
      age?: number;
      job: string;
      name?: string;
      hobbies: string;
      address: {
        home: {
          city: string;
          zip: string | null;
        };
      };
    }

    const record: IRawRecord = {
      job: 'Engineer ',
      name: 'John Doe',
      hobbies: 'Biking, Skating,,',
      address: {
        home: {
          city: 'Cupertino',
          zip: null,
        },
      },
    };

    const rules: TformRules<IRawRecord, IPerson> = {
      job: (X) => X.job(''), // test simply accessing attributes
      name: {
        // test deep rules
        first: (X) => X.name('abdc').split(' ')[0], // test type-checking on attributes
        last: (X) => X.name('').split(' ')[1],
      },
      age: (X) => X.age(-1), // test falling back to default value
      hobbies: (X) => splitList(',', X.hobbies('')), // test utility method `splitList`
      address: {
        home: (X) => X.address.home.city('').toLowerCase(), // test accessing nested properties
        work: (X) => (X.address as any).work.city('Unknown').toLowerCase(), // demonstrate nesting with defaults
      },
    };

    const expected = {
      job: 'Engineer',
      name: {
        first: 'John',
        last: 'Doe',
      },
      age: -1,
      hobbies: ['Biking', 'Skating'],
      address: {
        home: 'cupertino',
        work: 'unknown',
      },
    };

    const expectedKeyToInputKeyMap = new Map<string | number | symbol, Set<string | number | symbol>>();
    expectedKeyToInputKeyMap.set('job', new Set<string | number | symbol>());
    const expectedJobInput = expectedKeyToInputKeyMap.get('job');
    if (expectedJobInput) {
      expectedJobInput.add('job');
    }
    expectedKeyToInputKeyMap.set('first', new Set<string | number | symbol>());
    const expectedFirstInput = expectedKeyToInputKeyMap.get('first');
    if (expectedFirstInput) {
      expectedFirstInput.add('name');
    }
    const tform = new Tform(rules);
    const output = tform.transform(record);
    expect(output).toEqual(expected);
    expect(tform.getKeyToInputKeyMap().get('job')).toEqual(expectedJobInput);
    expect(tform.getKeyToInputKeyMap().get('first')).toEqual(expectedFirstInput);
  });

  test('basic error handling', () => {
    const rules: TformRules<{}, {}> = {
      error: () => {
        throw Error('oh noes!');
      },
      missing: (X: any) => X.foo(),
    };

    const record1 = { foo: 1 };
    const record2 = {};

    const tform = new Tform(rules);
    expect(tform.transform(record1)).toEqual({ missing: 1 });
    expect(tform.transform(record2)).toEqual({ missing: undefined });

    expect(tform.getErrors()).toEqual([
      {
        error: Error('oh noes!'),
        field: 'error',
        recordId: undefined,
        recordNo: 1,
        recordRaw: { foo: 1 },
      },
      {
        error: Error('oh noes!'),
        field: 'error',
        recordId: undefined,
        recordNo: 2,
        recordRaw: {},
      },
    ]);
  });

  test('error reporting of record id', () => {
    const rules: TformRules<any, any> = {
      missing: (X: any) => X.foo(),
    };
    const record1 = { pk: 1 };
    const record2 = {};

    const tform = new Tform(rules, 'pk' as any);
    expect(tform.transform(record1)).toEqual({});
    expect(tform.transform(record2)).toEqual({});
    expect(tform.getErrors()).toEqual([
      {
        error: TypeError("Missing ID key 'pk'"),
        recordNo: 2,
        recordRaw: {},
      },
    ]);
  });
});
