import _ from 'lodash';
import rdash from 'rethinkdbdash';
// import extend from '../index';
/*
let umap = []

// only insert valid values since we want to ignore nil values
_.forEach(_.pick(args, _.castArray(uniques)), (value, field) => {
  if (value || value === false) {
    umap.push({ value, field })
  }
})

if (!umap.length) return selection

const base = exclude
  ? selection.filter(rec => r.expr(_.castArray(exclude))
  .contains(rec('id')).not())
  : selection

return r.expr(umap).prepend([]).reduce((accum, f) => {
  return base.filter(rec => {
    return f('value').typeOf().eq("STRING").branch(
      rec(f('field')).match(r.add('(?i)^', f('value'), '$')),
      rec(f('field')).eq(f('value'))
    )
  })
    .count().ne(0).branch(
      accum.append(f('field')),
      accum
    )
})
*/

function rpath(base, parts) {
  return parts.prepend(base).reduce((accum, part) => {
    return accum(part);
  }).default(null);
}

const unique = [
  [ 'name' ]
];

const insertData = [
  { name: 'foo3', email: 'hi@hi.com' }
];

const r = rdash();

r.expr(unique).prepend([]).reduce((accum, path) => {
  return rpath(r.expr(insertData), path)
  .setIntersection(rpath(r.db('dev').table('foo').coerceTo('ARRAY'), path))
  .do(values => {
    return values.count().ne(0).branch(
      accum.append({ path, values }),
      accum
    );
  });
  /*
  return rpath(r.expr(insertData), u).filter(p => {
    return rpath(r.db('dev').table('foo').coerceTo('ARRAY'), u).contains(p)
    .branch(
      accum.append({ path: u, value: rpath(p, u).nth(0) }),
      accum
    );
  });
  */
})
.run()
.then(result => {
  console.log(result);
})
.catch(err => {
  console.error(err);
})
.finally(() => {
  setTimeout(() => {
    r.getPoolMaster().drain();
  });
});
/*
const r1 = extend(r);

r1.db('dev')
  .table('foo')
  .find({
    name: {
      $eq: 'foo1'
    }
  })
  .run()
  .then(result => {
    console.log(result);
  })
  .catch(err => {
    console.error(err);
  })
  .finally(() => {
    setTimeout(() => {
      r1.getPoolMaster().drain();
    });
  });
*/
