/* global beforeEach, afterEach, describe, it */
const assert = require('assert')
const ReactiveCollection = require('../lib/reactive-collection')
let collection = null

describe('Tests for ReactiveCollection', () => {
  beforeEach(() => {
    collection = new ReactiveCollection('test-collection')
  })

  afterEach(() => {
    collection = null
  })

  describe('Creation', () => {
    it('should have "test-collection" as _name', (done) => {
      assert.equal(collection._name, 'test-collection')
      done()
    })
  })

  describe('Subscription management', () => {
    it('should add a watcher', (done) => {
      const watcher = {}
      collection.subscribe(watcher, () => {})
      assert.equal(collection._watchers.has(watcher), true, 'No watcher found')
      done()
    })

    it('should throw an error while adding a watcher with wrong parameters', (done) => {
      const watcher = {}
      assert.throws(() => collection.subscribe(watcher, null), Error)
      assert.throws(() => collection.subscribe(null, () => {}), Error)
      assert.throws(() => collection.subscribe(null, null), Error)
      done()
    })

    it('should remove a watcher', (done) => {
      const watcher = {}
      collection.subscribe(watcher, () => {})
      collection.unsubscribe(watcher, () => {})
      assert.equal(collection._watchers.has(watcher), false, 'A watcher has been found')
      done()
    })

    it('should throw an error while removing a watcher with wrong parameter', (done) => {
      assert.throws(() => collection.unsubscribe(null), Error)
      done()
    })
  })

  describe('Data manipulation : insert', () => {
    beforeEach(() => {
      collection.insertMany([
        { num: 1 },
        { num: 2 },
        { num: 3 },
        { num: 4 }
      ])
    })

    it('should insert one document to collection', (done) => {
      collection.count()
        .then(() => collection.insertOne({ num: 5 }))
        .then(() => collection.count())
        .then(count => assert.equal(count, 5))
        .then(() => done())
    })

    it('should reject while inserting with insertOne()', (done) => {
      collection.insertOne([{ num: 5 }])
        .catch(error => assert.equal(!!error, true))
        .then(() => collection.insertOne('not an object'))
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })

    it('should insert many documents to collection', (done) => {
      // documents have been added in beforeEach
      collection.count()
        .then(count => assert.equal(count, 4))
        .then(() => done())
    })

    it('should reject while inserting with insertMany()', (done) => {
      collection.insertMany({ num: 5 })
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })

    it('should reject while inserting with insert()', (done) => {
      collection.insert('not an object')
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })

    it('should reject while inserting with bad _id', (done) => {
      collection.insert({ _id: '0', num: 5 })
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })
  })

  describe('Data manipulation : find', () => {
    beforeEach(() => {
      collection.insertMany([
        { num: 1 },
        { num: 2 },
        { num: 3 },
        { num: 4 }
      ])
    })

    it('should findOne document', (done) => {
      collection.findOne({})
        .then(result => {
          assert.equal(Array.isArray(result), false)
          assert.deepEqual(result, { _id: '0', num: 1 })
          done()
        })
    })

    it('should findOne and project content', (done) => {
      collection.findOne({}, { _id: 0, num: 1 })
        .then(result => {
          assert.deepEqual(result, { num: 1 })
          done()
        })
    })

    it('should findOne and project content with skip and sort', (done) => {
      // Descending order : First result should be {num: 4}
      // Skip 1, result should be {num: 3}
      collection.findOne({}, { num: 1 }, { sort: { num: -1 }, skip: 1 })
        .then(result => {
          assert.deepEqual(result, { _id: '2', num: 3 })
          done()
        })
    })

    it('should find many documents', (done) => {
      collection.find({})
        .then(result => {
          assert.equal(Array.isArray(result), true)
          assert.deepEqual(result.length, 4)
          done()
        })
    })

    it('should find many documents and project content', (done) => {
      collection.find({}, { _id: 0, num: 1 })
        .then(result => {
          assert.deepEqual(result, [
            { num: 1 },
            { num: 2 },
            { num: 3 },
            { num: 4 }
          ])
          done()
        })
    })

    it('should find many document and project content with skip, sort and limit', (done) => {
      collection.find({}, { _id: 0, num: 1 }, { sort: { num: -1 }, skip: 1, limit: 2 })
        .then(result => {
          assert.deepEqual(result, [{ num: 3 }, { num: 2 }])
          done()
        })
    })

    it('should reject with bad query for find()', (done) => {
      collection.find('not a query')
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })
  })

  describe('Data manipulation : update', () => {
    beforeEach(() => {
      collection.insertMany([
        { num: 1 },
        { num: 2 },
        { num: 3 },
        { num: 4 }
      ])
    })

    it('should update one document', (done) => {
      collection.updateOne({ num: { $gte: 3 } }, { $set: { updated: true } })
        .then(() => collection.find({ updated: true }))
        .then(updated => {
          assert.equal(updated.length, 1)
          done()
        })
    })

    it('should update many documents', (done) => {
      collection.updateMany({ num: { $gte: 3 } }, { $set: { updated: true } })
        .then(() => collection.find({ updated: true }))
        .then(updated => {
          assert.equal(updated.length, 2)
          done()
        })
    })

    it('should reject with bad query for update()', (done) => {
      collection.update('not a query')
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })

    it('should reject with bad replacement for update()', (done) => {
      collection.update({}, 'not a replacement')
        .catch(error => {
          assert.equal(!!error, true)
          done()
        })
    })

    it('should not update if no match', (done) => {
      collection.update({ num: 999 }, { num: 10 })
        .then(() => collection.find({ num: 10 }))
        .then(result => {
          assert.equal(result.length, 0)
          done()
        })
    })

    it('should upsert if no match', (done) => {
      collection.update({ num: 999 }, { num: 10 }, { upsert: true })
        .then(() => collection.find({ num: 10 }))
        .then(result => {
          assert.equal(result.length, 1)
          done()
        })
    })
  })

  describe('Data manipulation : remove', () => {
    beforeEach(() => {
      collection.insertMany([
        { num: 1 },
        { num: 2 },
        { num: 3 },
        { num: 4 }
      ])
    })

    it('should remove many documents', (done) => {
      collection.remove({ num: { $gte: 3 } })
        .then(() => collection.find())
        .then(result => {
          assert.equal(result.length, 2)
          done()
        })
    })

    it('should remove one document', (done) => {
      collection.remove({}, { justOne: true })
        .then(() => collection.find())
        .then(result => {
          assert.equal(result.length, 3)
          done()
        })
    })
  })

  describe('Document identification', () => {
    it('should auto increment _id', done => {
      assert.equal(collection._objectId(), 0)
      assert.equal(collection._objectId(), 1)
      assert.equal(collection._objectId(), 2)
      done()
    })
  })

  describe('Notification triggers', () => {
    it('should notify a watcher for insert', (done) => {
      const watcher = {}
      collection.subscribe(watcher, (data) => {
        assert.deepEqual(data, [{
          _id: '0',
          collection: 'test-collection',
          operationType: 'insert',
          fullDocument: {
            _id: '0',
            foo: 'bar'
          }
        }])
        done()
      })
      collection.insert({ foo: 'bar' })
    })

    it('should notify a watcher for update', (done) => {
      const watcher = {}
      collection.insert({ foo: 'bar' })
        .then(() => {
          collection.subscribe(watcher, (data) => {
            assert.deepEqual(data, [{
              _id: '0',
              collection: 'test-collection',
              operationType: 'update',
              fullDocument: {
                _id: '0',
                foo: 'barbar'
              }
            }])
            done()
          })
          collection.update({ foo: 'bar' }, { foo: 'barbar' })
        })
    })

    it('should notify a watcher for remove', (done) => {
      const watcher = {}
      collection.insert({ foo: 'bar' })
        .then(() => {
          collection.subscribe(watcher, (data) => {
            assert.deepEqual(data, [{
              _id: '0',
              collection: 'test-collection',
              operationType: 'remove'
            }])
            done()
          })
          collection.remove()
        })
    })

    it('should notify a watcher once for many operations in less than 200ms', (done) => {
      const watcher = {}
      collection.subscribe(watcher, (data) => {
        assert.deepEqual(data, [{
          _id: '0',
          collection: 'test-collection',
          operationType: 'insert',
          fullDocument: {
            _id: '0',
            foo: 'bar'
          }
        }, {
          _id: '1',
          collection: 'test-collection',
          operationType: 'insert',
          fullDocument: {
            _id: '1',
            bar: 'foo'
          }
        }])
        done()
      })
      collection.insert({ foo: 'bar' })
        .then(() => collection.insert({ bar: 'foo' }))
    })
  })

  describe('Element content validation', () => {
    it('should not validate if element has not the queried property', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 'a' }, { bar: 'a' }), false)
      done()
    })

    it('should validate if element has the same queried property value (primitive)', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 'a' }, { foo: 'a' }), true)
      done()
    })

    it('should validate if element match query "sub property"', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 'a' }, { foo: { bar: 'a' } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: { bar: 'a' } }, { foo: { bar: 'a' } }), true)
      done()
    })

    it('should validate if element match query with many properties', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 'a', bar: 'b' }, { foo: 'c', bar: 'd' }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 'a', bar: 'b' }, { foo: 'a', bar: 'd' }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 'a', bar: 'b' }, { foo: 'c', bar: 'b' }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 'a', bar: 'b' }, { foo: 'a', bar: 'b' }), true)
      done()
    })

    it('should validate operator $lte', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lte: 100 } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lte: 101 } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lte: 99 } }), false)
      done()
    })

    it('should validate operator $lt', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lt: 100 } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lt: 101 } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $lt: 99 } }), false)
      done()
    })

    it('should validate operator $gte', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gte: 100 } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gte: 101 } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gte: 99 } }), true)
      done()
    })

    it('should validate operator $gt', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gt: 100 } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gt: 101 } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $gt: 99 } }), true)
      done()
    })

    it('should validate operator $ne', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $ne: 100 } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $ne: 101 } }), true)
      done()
    })

    it('should validate operator $eq', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $eq: 100 } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $eq: 101 } }), false)
      done()
    })

    it('should validate operator $in', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $in: [100, 101] } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $in: [101, 102] } }), false)
      done()
    })

    it('should validate operator $nin', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $nin: [100, 101] } }), false)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $nin: [101, 102] } }), true)
      done()
    })

    it('should validate operator $exists', done => {
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $exists: true } }), true)
      assert.equal(collection._elementIsValidForQuery({ foo: 100 }, { foo: { $exists: false } }), false)
      done()
    })
  })

  describe('Order array of object by many properties', () => {
    const SORT_DATA_1A = { num: 1, str: 'aaa' }
    const SORT_DATA_2A = { num: 2, str: 'aaa' }
    const SORT_DATA_1B = { num: 1, str: 'bbb' }
    const SORT_DATA_2B = { num: 2, str: 'bbb' }

    it('should order ascending with for one property', done => {
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_2A, { num: 1 }, ['num'], 0),
        -1, 'A < B, so result should be -1'
      )
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2A, SORT_DATA_1A, { num: 1 }, ['num'], 0),
        1, 'A > B, so result should be 1'
      )
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_1A, { num: 1 }, ['num'], 0),
        0, 'A == B, so result should be 0'
      )
      done()
    })

    it('should order descending with for one property', done => {
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_2A, { num: -1 }, ['num'], 0),
        1, 'A < B, so result should be 1'
      )
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2A, SORT_DATA_1A, { num: -1 }, ['num'], 0),
        -1, 'B > A, so result should be -1'
      )
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_1A, { num: -1 }, ['num'], 0),
        0, 'A == B, so result should be 0'
      )
      done()
    })

    it('should order descending with for many properties', done => {
      // 1A-1A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_1A, { num: 1, str: 1 }, ['num', 'str'], 0),
        0, 'A == B, so result should be 0'
      )
      // 1A-1B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_1B, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 1A-2A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_2A, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 1A-2B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1A, SORT_DATA_2B, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 1B-1A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1B, SORT_DATA_1A, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      // 1B-2A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1B, SORT_DATA_2A, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 1B-2B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_1B, SORT_DATA_2B, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 2A-1A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2A, SORT_DATA_1A, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      // 2A-1B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2A, SORT_DATA_1B, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      // 2A-2B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2A, SORT_DATA_2B, { num: 1, str: 1 }, ['num', 'str'], 0),
        -1, 'A < B, so result should be -1'
      )
      // 2B-1A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2B, SORT_DATA_1A, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      // 2B-1B
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2B, SORT_DATA_1B, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      // 2B-2A
      assert.equal(
        collection._orderByManyProperties(SORT_DATA_2B, SORT_DATA_2A, { num: 1, str: 1 }, ['num', 'str'], 0),
        1, 'A > B, so result should be 1'
      )
      done()
    })
  })
})
