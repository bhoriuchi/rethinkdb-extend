import _ from 'lodash';
import docFilter from 'rethinkdb-doc-filter';
import { rpath, debug, uniqueViolations } from './utilities';

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
            const primaryKey = _.get(
              globalOpts,
              [ 'constraints', db, state.table, primaryKey ],
              opts.primaryKey
            );

            return _.isArray(unique) && unique.length ?
              wrap(
                r,
                uniqueViolations(
                  r,
                  target,
                  unique,
                  _.castArray(objects),
                  property,
                  _.isString(primaryKey) ? primaryKey : 'id'
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
