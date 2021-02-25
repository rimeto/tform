----
**This project is now deprecated. Consider using [Optional Chaining](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html) instead.**
----

# tform

<br>

## Purpose

Written in TypeScript and short for record transformer, Tform applies a given set of rules to transform JSON-like structured data into a different shape. Rules take the form of easy-to-read-and-write functional expressions that can be serialized and applied safely at runtime.

Transformation state does not persist between records. Tform works well as a pre-processor for data from external sources, especially for record canonicalization.


## Design Philosophy

* *Easy-to-read-and-write rules.* Rules should be concise and comprehensible, providing an overview of the transformation at glance
* *Extensible.* Third-party code can customize the transformation behavior easily and flexibly.
* *Exception handling.* Tform handles errors gracefully, collecting errors to report later.
* *Serializable.* Rules are simple enough to be serialized and thrown into a database. Tform provides de-serialization functionality.
* *Type-checking.* Tform allows your rules to be type-checked at compile time.
* *Statelessness.* State should be minimized, and where needed, made explicit.


<br>
<br>


# Documentation

## Overview of API

1. Define an interface for your JSON input
1. Define rules for transformation (or de-serialize rules as described later on)
1. Create a `Tform` instance
1. Use the instance to transform records


        interface IRawRecord {
          ...
        }

        interface IPerson {
          ...
        }

        const record: IRawRecord = ...;

        const rules: IRules<IRawRecord, IPerson> = { ... };

        const tform = new Tform(rules);
        const output = tform.transform(record);



## Rules Syntax

To transform records, you define some rules as map/dictionary. Each rule is a function that takes in a special object `X`. You can then access some property `foo` of your input JSON using the syntax `X.foo()`. Tform is written to with type-checking in mind: If you defined `foo` as a string in your interface, `X.foo()` will type-check as a string!

If the input record does not define property `foo`, tform logs an error (see exception handling below). Optionally, you can provide a default value as so: `X.foo('default_value')`.

Rules do not have to be flat; they can be nested.


## Extending Tform

Ideally, rules are no more than a line (or two) long; this way, you can glance at some rules and grasp the shape of the transformation. If you have a complicated transformation, consider extracting functionality into helper functions.

Tform comes with a core set of utility functions:

* splitList()
* wrapList()

You are encouraged to also create your own library of small, reusable functions specific to your code base to help with rule transformation.


## Full Example

    interface IPerson {
      job: string;
      name: {
        first: string;
        last: string;
      };
      age: number;
      hobbies: string[];
      address: {
        city: string;
        zip: string;
      };
    }

    interface IRecord {
      job: string;
      name: string;
      hobbies: string;
      address: {
        city: string;
        zip: string | null;
      };
    }

    const record: IRecord = {
      job: 'Engineer ',
      name: 'John Doe',
      hobbies: 'Biking; Skating;;',
      address: {
        city: 'Cupertino',
        zip: null,
      },
    };

    const rules: IRules<IRecord, IPerson> = {
      job: (X) => X.job(''),
      name: {
        first: (X) => X.name('').split(' ')[0],
        last: (X) => X.name('').split(' ')[1],
      },
      age: (X) => X.age(-1),
      hobbies: (X) => splitList(';', X.hobbies('')),
      address: {
        city: (X) => X.address.city(''),
        zip: (X) => X.address.zip(''),
      },
    };

With the above interface and rules, the input record is transformed into:

    {
      job: 'Engineer',
      name: {
        first: 'John',
        last: 'Doe',
      },
      age: -1,
      hobbies: ['Biking', 'Skating'],
      address: {
        city: 'Cupertino',
        zip: null,
      },
    };


## Exception Handling

On encountering an error, Tform catches and collects the error. You can later access all the errors collected so far using `tform.getErrors()`, which returns a list of `TformError`s. The errors can be cleared using `tform.clearErrors()`.

By default, Tform reports which record caused the error as well as which field (if any). Optionally, you can have the `TformError` identify the associated record by an ID property of the record, which you supply as the `idKey` argument to the `Tform` constructor.

## License

tform is [MIT licensed](./LICENSE).
