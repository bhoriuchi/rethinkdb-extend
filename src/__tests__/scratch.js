import _ from 'lodash';
import rdash from 'rethinkdbdash';
import extend from '../index';
import { expandUnique, rpath } from '../utilities';

const r = rdash({ silent: true });
/*
const r = extend(rdash({ silent: true, db: 'dev' }), {
  db: 'dev',
  constraints: {
    dev: {
      foo: {
        unique: [
          'name',
          'email'
        ]
      }
    }
  }
});

r.table('foo').insert({
  name: 'foo3',
  email: 'foo3@bar.com'
})
*/

const selection = r.db('dev').table('foo');

const unique = [ 'name' ];

const data = val => {
  return val.merge({
    ext: val('name').add('!')
  });
};

const primaryKey = 'id';

selection.typeOf().do(type => {
  return type.eq('TABLE')
  .or(type.eq('SELECTION<STREAM>'))
  .or(type.eq('SELECTION<ARRAY>'))
  .branch(
    selection.coerceTo('ARRAY'),
    [ selection ]
  );
})
.do(selectionArray => {
  return r.expr(
    _.isFunction(data) ?
      selectionArray.prepend([]).reduce((accum, doc) => {
        return accum.append(data(doc));
      }) :
      r.expr(data)
  )
  .do(updates => {
    return r.expr(expandUnique(unique)).prepend([])
    .reduce((violations, configs) => {
      return updates.prepend([]).reduce((docMatch, doc) => {
        return updates.difference([ doc ]).setUnion(selectionArray)
        .prepend([]).reduce((values, value) => {
          return configs.prepend([]).reduce((matches, config) => {
            
          });
        });
      });
    });
  });
})
.run()
.then(result => {
  console.log(JSON.stringify(result, null, '  '));
})
.catch(err => {
  console.error(err.msg);
})
.finally(() => {
  setTimeout(() => {
    r.getPoolMaster().drain();
  });
});
