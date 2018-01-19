/*

// unique config for insert/update
const unique = [
  'id',
  'foo',
  [ 'foo', 'bar' ]
];


// unique config for global
const globalOptions = {
  constraints: {
    dbName: {
      tableName: {
        unique: [...]
      }
    }
  }
}
*/
import _ from 'lodash';
import docFilter from 'rethinkdb-doc-filter';

function debug(data) {
  if (process.env.DEBUG) {
    return _.isError(data) ?
      process.stderr.write(data.toString()) :
      process.stdout.write(String(data));
  }
}

function rpath(base, parts) {
  return parts.prepend(base).reduce((accum, part) => {
    return accum(part);
  }).default(null);
}

/**
 * Checkd for a unique violation
 * @param {*} r - top-level namespace
 * @param {*} selection - table to check for violations
 * @param {*} unique - unique paths to check
 * @param {*} object - record(s) to insert
 */
function violatesUnique(r, selection, unique, data, method, primaryKey = 'id') {
  if (!data) {
    return r.expr([]);
  }

  /**
   * TODO:
   * evaluate documents for violation among itself
   * support functions
   * support update and replace
   */
  if (method === 'insert') {
    r.expr(unique).prepend([]).reduce((accum, path) => {
      return rpath(r.expr(_.castArray(data)), path)
      .setIntersection(rpath(selection.coerceTo('ARRAY'), path))
      .do(values => {
        return values.count().ne(0).branch(
          accum.append({ path, values }),
          accum
        );
      });
    });
  }
  return r.expr([]);
}

function wrap(r, selection, globalOpts, parentState = {}) {
  const state = _.cloneDeep(parentState);
  const proxy = new Proxy(selection, {
    get(target, property) {
      switch (property) {
        // db and table update the state object and are used
        // to lookup global options like unique constraints
        case 'db':
        case 'table':
          return function (...args) {
            state[property] = args[0];
            return wrap(r, target[property](...args), globalOpts, state);
          };

        case 'find':
          return function (queryDocument) {
            return wrap(
              r,
              docFilter(r, target, queryDocument),
              globalOpts,
              state
            );
          };

        case 'getPath':
          return function (path) {
            return wrap(r, rpath(target, _.toPath(path)), globalOpts, state);
          };

        case 'insert':
        case 'update':
        case 'replace':
          return function (objects, options) {
            const opts = Object.assign({}, options);
            const insertOpts = _.omit(opts, [ 'unique', 'primaryKey' ]);
            const db = state.db || globalOpts.db || 'test';
            const unique = _.get(
              globalOpts,
              [ 'constraints', db, state.table, 'unique' ],
              opts.unique
            );

            return _.isArray(unique) && unique.length ?
              wrap(
                r,
                violatesUnique(
                  r,
                  target,
                  unique,
                  objects,
                  property,
                  opts.primaryKey
                )
                .do(violations => {
                  return violations.count().ne(0).branch(
                    r.error(r.add('Unique violations: ', violations.toJSON())),
                    target.insert(objects, insertOpts)
                  );
                }),
                globalOpts,
                state
              ) :
              wrap(r, target.insert(objects, insertOpts), globalOpts, state);
          };

        default:
          const prop = target[property];
          return _.isFunction(prop) ?
            function (...args) {
              try {
                const sel = target[property](...args);
                return _.isObjectLike(sel) ?
                  wrap(r, sel, globalOpts, state) :
                  sel;
              } catch (err) {
                debug(err);
                return target[property];
              }
            } :
            prop;
      }
    }
  });
  return proxy;
}

export default function extend(r, options) {
  const opts = Object.assign({}, options);
  return wrap(r, r, opts);
}
