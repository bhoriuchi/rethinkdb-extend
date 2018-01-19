import _ from 'lodash';

export function rpath(base, parts) {
  return parts.prepend(base).reduce((accum, part) => {
    return accum(part);
  }).default(null);
}

export function expandUniqueStringConfig(str) {
  return {
    path: _.toPath(str),
    ignoreCase: true
  };
}

export function expandUniqueObjectConfig(obj) {
  const { path, ignoreCase } = obj;
  return {
    path: _.toPath(path),
    ignoreCase: ignoreCase !== false
  };
}

export function uniqPush(list, value) {
  if (!_.filter(list, item => _.isEqual(item, value)).length) {
    list.push(value);
  }
}

export function expandUnique(config) {
  return config.reduce((accum, c) => {
    if (_.isString(c)) {
      uniqPush(accum, [ expandUniqueStringConfig(c) ]);
    } else if (_.isPlainObject(c)) {
      uniqPush(accum, [ expandUniqueObjectConfig(c) ]);
    } else if (_.isArray(c)) {
      const value = _.reduce(c, (a, v) => {
        if (_.isString(v)) {
          uniqPush(a, expandUniqueStringConfig(v));
        } else if (_.isPlainObject(v)) {
          uniqPush(a, expandUniqueObjectConfig(v));
        }
        return a;
      }, []);
      uniqPush(accum, value);
    }
    return accum;
  }, []);
}

export function debug(data) {
  if (process.env.DEBUG) {
    return _.isError(data) ?
      process.stderr.write(data.toString()) :
      process.stdout.write(String(data));
  }
}

export function uniqueViolations(
  r,
  selection,
  unique,
  data,
  command,
  primaryKey
) {
  return r.expr(expandUnique(unique)).prepend([])
  .reduce((violations, configs) => {
    return r.expr(data).do(docs => {
      return docs.prepend([]).reduce((docMatch, doc) => {
        return docs.difference([ doc ]).setUnion(selection.coerceTo('ARRAY'))
        .prepend([]).reduce((values, value) => {
          return configs.prepend([]).reduce((matches, config) => {
            return config('ignoreCase').branch(
              rpath(value, config('path')).match(
                r.add('(?i)^', rpath(doc, config('path')), '$')
              ),
              rpath(value, config('path')).eq(rpath(doc, config('path')))
            )
            .branch(
              matches.append({
                path: config('path'),
                value: rpath(value, config('path'))
              }),
              matches
            );
          })
          .do(cmatch => {
            return cmatch.count().ge(configs.count()).branch(
              values.append(cmatch),
              values
            );
          });
        });
      });
    })
    .do(matchValues => {
      return matchValues.count().ne(0).branch(
        violations.append(matchValues.nth(0)),
        violations
      );
    });
  });
}
