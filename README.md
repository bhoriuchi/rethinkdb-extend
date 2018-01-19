# rethinkdb-extend
Extend RethinkDB drivers with additional features

## Introduction

This library aims to add additional functionality to existing ReQL commands and add additional commands for tedious tasks.

## API

Initialization of `rethindb-extend` returns a `Proxy` that intercepts ReQL commands and processes them allowing existing commands to be augmented and new commands to be added.

**`extendRethinkDB( r:Client [, options:Object] )`**

`options`
* `constraints` {Object} - Constraints object 

**Example**
```js
import rdash from 'rethinkdbdash';
import extendRethinkDB from 'rethinkdb-extend';

const r = extendRethinkDB(rdash(), {
  constraints: {
    test: {
      foo: {
        unique: [ 'name' ]
      }
    }
  }
});
```

### Added Commands

**`find( queryDocument )`**

Provides MongoDB-like query document filter using [rethinkdb-doc-filter](https://github.com/bhoriuchi/rethinkdb-doc-filter)

### Extended Commands

**`insert( object | [object1, object2, ...][, extendedOptions] )`**

Extended options for additional functionality during insert are provided on top of standard options

`extendedOptions`
* `unique` {Array&lt;String | Array&lt;String&gt;&gt;} - List of unique paths or compound paths

**`update( object | function[, extendedOptions] )`**

Extended options for additional functionality during update are provided on top of standard options

`extendedOptions`
* `unique` {Array&lt;String | Array&lt;String&gt;&gt;} - List of unique paths or compound paths

**`replace( object | function[, extendedOptions] )`**

Extended options for additional functionality during replace are provided on top of standard options

`extendedOptions`
* `unique` {Array&lt;String | Array&lt;String&gt;&gt;} - List of unique paths or compound paths