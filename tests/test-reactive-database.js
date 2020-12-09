/* global beforeEach, afterEach, describe, it */
const assert = require('assert')
const ReactiveDatabase = require('../lib/reactive-database')
let db = null

describe('Tests for ReactiveDatabase', () => {
  beforeEach(() => {
    db = new ReactiveDatabase()
  })

  afterEach(() => {
    db = null
  })

  describe('Creation', () => {
    it('should contain no collection', (done) => {
      assert.deepEqual(db.collections, {}, 'Collections not initialized')
      done()
    })
  })

  describe('Connection', () => {
    it('should support MongoDB connect() method', (done) => {
      db.connect()
        .then(done)
    })
  })

  describe('Collections management', () => {
    it('should create a collection', (done) => {
      db.getCollection('my-col')
      assert.deepEqual(db.showCollections(), ['my-col'], 'The DB should contain a collection named "my-col"')
      done()
    })

    it('should not create two collections with the same name', (done) => {
      db.getCollection('my-col')
      db.getCollection('my-col')
      assert.deepEqual(db.showCollections(), ['my-col'], 'The DB should only contain ONE collection named "my-col"')
      done()
    })
  })
})
