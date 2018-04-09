/**
 * Copyright (C) 2018-present, Rimeto, LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* tslint:disable:interface-name */

/**
 * A generic type that cannot be `undefined`
 */
export type Defined<T> = Exclude<T, undefined>;

/**
 * TFormObjectWrapper gives TypeScript visibility into the properties of our
 * Proxied objects at compile time.
 */
// prettier-ignore
export type TformObjectWrapper<T> = { [K in keyof T]-?: TformRecordDataType<T[K]> };

/**
 * TformArrayWrapper represents an Array of TFormObjectWrapper.
 */
export interface TformArrayWrapper<T> extends Array<TformRecordDataType<T>> {}

/**
 * Union TformDataWrapper type to handle both Arrays + Objects
 */
export type TformDataWrapper<T> = T extends any[]
  ? TformArrayWrapper<T[number]>
  : T extends object ? TformObjectWrapper<T> : TformDataProxy<T>;

/**
 * Interface for data accessor w/o default value.
 * Note: we deliberately assume any data accessor can return
 * undefined for programming safety.
 */
export type TformDataProxyWithoutDefault<T> = () => Defined<T> | undefined;

/**
 * Interface for data accessor w/ default value.
 * @param defaultValue
 */
export type TformDataProxyWithDefault<T> = (defaultValue: Defined<T>) => Defined<T>;

/**
 * TformDataProxy wraps a generic object with a data accessor method.
 */
export type TformDataProxy<T> = TformDataProxyWithoutDefault<T> & TformDataProxyWithDefault<T>;

/**
 * TformRecordDataType
 */
export type TformRecordDataType<T> = TformDataWrapper<T> & TformDataProxy<T>;

/**
 * Proxies access to the given record object in a nullsafe manner.
 * To dereference a given value, invoke it as a function with optional
 * default value.
 *
 * For example, given:
 *   const x = {
 *     a: 'hello',
 *     b: {
 *       d: 'world',
 *     }
 *   }
 *
 * Then:
 *   x.a() === 'hello' &&
 *   x.b.d() === 'world' &&
 *   x.b.z() === undefined &&
 *   x.b.z('default value') === 'default value' &&
 *   z.y.z.a.b.c.d.e.f.g.h.i.j.k() === undefined
 */
export function RecordProxy<T>(data?: T): TformRecordDataType<T> {
  return new Proxy(
    ((defaultValue?: Defined<T>) => (data !== undefined ? data : defaultValue)) as TformRecordDataType<T>,
    {
      get: (target, key) => {
        const obj: any = target();
        if ('object' !== typeof obj) {
          return RecordProxy();
        }

        // Propagate proxy to Array elements if we're invoking an array method
        if (obj instanceof Array && (Array.prototype as any)[key] instanceof Function) {
          const proxied: any = obj.map((e: any) => RecordProxy(e));
          return proxied[key].bind(proxied);
        }

        return RecordProxy(obj[key]);
      },
    },
  );
}
