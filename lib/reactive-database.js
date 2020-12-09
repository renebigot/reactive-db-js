const ReactiveCollection = require('./reactive-collection')

/**
 * ReactiveDatabase is a reactive database. Each updates
 * made on one of its collections content triggers a notification.
 * The BDD content is not persisted to disk.
 * If the app is restarted, all content will be lost.
 * Data are not indexed. So you should not use it for large collection set
 * (but everything is in RAM, so it should still be quite fast).
 * Query system is based on MongoDB syntax.
 * Notifications are sent through a subscription mecanism.
 *
 * @example
 * const db = new ReactiveDatabase()
 * const collection = db.getCollection('superheroes')
 * collection.subscribe(this, data => {
 *   console.log(data)
 * })
 *
 * collection.insertOne({
 *   firstname: 'Steve',
 *   lastname: 'Rogers',
 *   hasSuperPower: true
 * })
 * collection.insertOne({
 *   firstname: 'Peter',
 *   lastname: 'PARKER',
 *   hasSuperPower: true
 * })
 *
 * setTimeout(() => {
 *   collection.insertMany([
 *     {
 *       firstname: 'Tony',
 *       lastname: 'STARK',
 *       hasSuperPower: false
 *     },
 *     {
 *       firstname: 'Bruce',
 *       lastname: 'BANNER',
 *       hasSuperPower: true
 *     }
 *   ])
 * }, 2000)
 *
 * setTimeout(() => {
 *   collection.updateMany({
 *     hasSuperPower: false
 *   }, {
 *     $set: {
 *       isLuckyGuy: true
 *     }
 *   })
 * }, 4000)
 *
 * setTimeout(() => {
 *
 *   collection.updateOne({
 *     hasSuperPower: true
 *   }, {
 *     $set: {
 *       isLuckyGuy: 'tooooooooot' // No inspiration :)
 *     }
 *   })
 * }, 6000)
 *
 * setTimeout(() => {
 *   collection.removeOne({
 *     hasSuperPower: true
 *   })
 * }, 8000)
 *
 * setTimeout(() => {
 *   collection.remove({})
 * }, 10000)
 *
 * setTimeout(() => {
 *   console.log('Collections:')
 *   console.log('  - ' + db.showCollections().join('\n  - '))
 * }, 6000)
 *
 * @class ReactiveDatabase
 */
class ReactiveDatabase {
  constructor () {
    this.collections = {}
  }

  /**
   *Only for compatibility with MongoDB API. `db.connect()` just return a resolved `Promise`.
   *
   * @returns Promise
   * @memberof ReactiveDatabase
   */
  connect () {
    return Promise.resolve()
  }

  /**
   * Get every known collections name.
   *
   * @returns Object[]
   * @memberof ReactiveDatabase
   */
  showCollections () {
    return Object.keys(this.collections)
  }

  /**
   * The first time `db.getCollection(collectionName)` is called,
   * the collection named `collectionName` will be created and returned.
   * The other times, the collection will just be returned.
   *
   * @param {String} name Name of the collection to get.
   * @returns
   * @memberof ReactiveDatabase
   */
  getCollection (name) {
    if (this.collections[name] === undefined) {
      this.collections[name] = new ReactiveCollection(name)
    }

    return this.collections[name]
  }
}

module.exports = ReactiveDatabase
