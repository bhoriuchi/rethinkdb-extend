import _ from 'lodash';
import rdash from 'rethinkdbdash';
import extend from '../index';

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
