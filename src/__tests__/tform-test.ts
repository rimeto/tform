/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { IJSONRecord, IRules, splitList, Tform } from '../index';

describe('tform', () => {
  test('basic transforming', () => {
    interface IPerson {
      job: string;
      name: string;
      age: number;
      hobbies: string;
      address: {
        home: {
          city: string;
          zip: number;
        };
        work: {
          city: string;
          zip: number;
        };
      };
    }

    const record = {
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

    const rules: IRules<IPerson> = {
      job: (X) => X.job(), // test simply accessing attributes
      name: {
        // test deep rules
        first: (X) => X.name().split(' ')[0], // test type-checking on attributes
        last: (X) => X.name().split(' ')[1],
      },
      age: (X) => X.age(-1), // test falling back to default value
      hobbies: (X) => splitList(',', X.hobbies()), // test utility method `splitList`
      city: {
        home: (X) =>
          X.address()
            .home({})
            .city('')
            .toLowerCase(), // test accessing nested properties
        work: (X) =>
          X.address()
            .work({})
            .city('Unknown')
            .toLowerCase(), // demonstrate nesting with defaults
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
      city: {
        home: 'cupertino',
        work: 'unknown',
      },
    };

    const tform = new Tform<IPerson>(rules);
    const output = tform.transform(record);
    expect(output).toEqual(expected);
  });

  test('basic error handling', () => {
    const rules: IRules<any> = {
      error: () => {
        throw Error('oh noes!');
      },
      missing: (X) => X.foo(),
    };

    const record1: IJSONRecord = { foo: 1 };
    const record2: IJSONRecord = {};

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
      {
        error: Error("property 'missing' of result is undefined"),
        field: 'missing',
        recordId: undefined,
        recordNo: 2,
        recordRaw: {},
      },
    ]);
  });

  test('error reporting of record id', () => {
    const rules: IRules<any> = {
      missing: (X) => X.foo(),
    };
    const record1 = { pk: 1 };
    const record2 = {};

    const tform = new Tform(rules, 'pk');
    expect(tform.transform(record1)).toEqual({});
    expect(tform.transform(record2)).toEqual({});
    expect(tform.getErrors()).toEqual([
      {
        error: Error("property 'missing' of result is undefined"),
        field: 'missing',
        recordId: 1,
        recordNo: 1,
        recordRaw: { pk: 1 },
      },
      {
        error: TypeError("Missing ID key 'pk'"),
        recordNo: 2,
        recordRaw: {},
      },
      {
        error: Error("property 'missing' of result is undefined"),
        field: 'missing',
        recordId: undefined,
        recordNo: 2,
        recordRaw: {},
      },
    ]);
  });
});
