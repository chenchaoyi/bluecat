'use strict';

const expect = require('chai').expect;
const validateApi = require('../lib/validate-api');

describe('validateApi', function() {
  it('accepts a valid tree', function() {
    expect(() => validateApi({
      api: {
        users: {
          method: ['GET', 'POST'],
          schema: 'https'
        }
      }
    })).to.not.throw();
  });

  it('rejects unknown HTTP methods', function() {
    expect(() => validateApi({
      api: { users: { method: ['FETCH'] } }
    })).to.throw(/FETCH/);
  });

  it('rejects non-array method', function() {
    expect(() => validateApi({
      api: { users: { method: 'GET' } }
    })).to.throw(/array/);
  });

  it('rejects invalid schema', function() {
    expect(() => validateApi({
      api: { users: { method: ['GET'], schema: 'ftp' } }
    })).to.throw(/schema/);
  });

  it('rejects array root', function() {
    expect(() => validateApi([])).to.throw(/root must be an object/);
  });

  it('reports a useful path on failure', function() {
    expect(() => validateApi({
      api: { v1: { users: { method: ['BOGUS'] } } }
    })).to.throw(/api\.v1\.users/);
  });
});
