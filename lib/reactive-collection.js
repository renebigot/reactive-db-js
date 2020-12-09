const modify = require('modifyjs')
/**
 * ReactiveCollection is a reactive collection. Each updates
 * made on its content triggers a notification.
 * Notifications are sent through a subscription mecanism.
 *
 * @class ReactiveCollection
 */
class ReactiveCollection {
  constructor (name) {
    this._name = name
    this._content = []
    this._watchers = new Map()
    this._lastId = 0
    this._changesToNotify = []
  }

  /**
   * When one or many documents of the collection is created, updated or removed `callback` will be called with `watcher` as its `this`.
   * **NOTE:** A collection can have many watchers. A watcher can subscribe to many collection. A watcher can subscribe only once to a collection (only the latest subscription will be retain).
   *
   * @param {Object} watcher
   * @param {Function} callback
   * @memberof ReactiveCollection
   *
   * @example
   * collection.subscribe(this, changes => {
   *   console.log(`${changes.length} documents have been created, updated or removed.`)
   *
   *   changes.forEach(change => {
   *     console.log(`[${change.collection}] The document _id "${change._id}" is marked with operation type "${change.operationType}".`) // [superheroes] The document _id "1" is marked with operation type "insert".
   *     if (change.fullDocument !== undefined) {
   *       // fullDocument only for "insert" or "update" operationType.
   *       console.log(`New content: ${change.fullDocument}`)
   *     }
   *   })
   * })
   */
  subscribe (watcher, callback) {
    if (watcher && callback) {
      this._watchers.set(watcher, callback)
    } else {
      throw new Error('No watcher or callback has been specified')
    }
  }

  /**
   * Remove `watcher` fore the collections watchers.
   *
   * @param {Any} watcher
   * @memberof ReactiveCollection
   */
  unsubscribe (watcher) {
    if (this._watchers.has(watcher)) {
      this._watchers.delete(watcher)
    } else {
      throw new Error('No watcher has been specified')
    }
  }

  /**
   * Returns a promise that resolves to the number of documents inside the collection.
   *
   * @returns Promise<Number>
   * @memberof ReactiveCollection
   */
  count () {
    return Promise.resolve(this._content.length)
  }

  /**
   * Insert one or many documents in the collection.
   * Use the same syntax as `collection.insertOne()` or `collection.insertMany()`.
   * Once done, the promise is resolve.
   *
   * @param {(Object|Object[])} data
   * @returns Promise
   * @memberof ReactiveCollection
   */
  insert (data) {
    return new Promise((resolve, reject) => {
      if (typeof data !== 'object') { // array is typeof 'object' !
        return reject(new Error('"data" is not of type object or array'))
      }
      if (!Array.isArray(data)) {
        data = [data]
      }

      let badId = null

      data.forEach(obj => {
        if (obj._id === undefined) {
          obj._id = this._objectId()
        } else if (this._content.findIndex(el => obj._id === el._id) >= 0) {
          badId = obj._id
        }
      })

      if (badId !== null) {
        return reject(new Error(`An object with _id ${badId} already exist in this collection`))
      }

      this._content = [...this._content, ...data]
      this._notifyChangesForIds(data.map(el => el._id), 'insert')

      return resolve()
    })
  }

  /**
   * Insert one document in the collection. Once done, the promise is resolve.
   *
   * @param {Object} data
   * @returns Promise
   * @memberof ReactiveCollection
   * @example
   * collection.insertOne({
   *   firstname: 'Peter',
   *   lastname: 'PARKER',
   *   age: 25,
   *   hasSuperPower: true
   * })
   */
  insertOne (data) {
    if (typeof data !== 'object') { // array is typeof 'object' !
      return Promise.reject(new Error('"data" is not of type object'))
    } else if (Array.isArray(data)) {
      return Promise.reject(new Error('"data" can\'t be an array'))
    }

    return this.insert(data)
  }

  /**
   * Insert many documents in the collection. Once done, the promise is resolve.
   *
   * @param {Object[]} data
   * @returns Promise
   * @memberof ReactiveCollection
   * @example
   * collection.insertMany([
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
   */
  insertMany (data) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(data)) {
        return reject(new Error('"data" must be an array'))
      }

      this.insert(data).then(resolve).catch(reject)
    })
  }

  /**
   * Find all documents matching a query.
   * Query can use some of MongoDB query operations :
   * `$lte`, `$lt`, `$gte`, `$gt`, `$ne` and `$exists`.
   *
   * @param {Object} [query={}]
   * @param {Object} [projection=undefined]
   * @param {Object} [options=undefined]
   * @returns Promise<Object[]>
   * @memberof ReactiveCollection
   * @example
   * // find all documents
   * collection.find()
   *
   * // find all documents for Tony STARK
   * collection.find({ firstname: 'Tony', lastname: 'STARK' })
   *
   * // find all firstnames, in descending order. Results limited to 2nd - 11th
   * collection.find({}, { _id: 0, firstname}, { sort: { firstname: -1 }, limit: 10, skip: 1 })
   */
  find (query = {}, projection = undefined, options = undefined) {
    if (typeof query !== 'object' && !Array.isArray(query)) {
      return Promise.reject(new Error('"query" must be an object'))
    }

    options = options || {}

    return Promise.resolve(this._content.filter(el => {
      return this._elementIsValidForQuery(el, query)
    }))
      .then(results => {
        const keys = Object.keys(options.sort || {})
        if (keys.length === 0) {
          return results
        }
        results = results.sort((a, b) => {
          return this._orderByManyProperties(a, b, options.sort, keys, 0)
        })

        return results
      })
      .then(results => options.skip > 0 ? results.splice(options.skip) : results)
      .then(results => options.limit > 0 ? results.splice(0, options.limit) : results)
      .then(results => {
        if (projection) {
          const projectionKeys = Object.keys(projection)

          return results.map(el => {
            const retVal = {
              _id: el._id,
              ...projectionKeys.reduce((final, current) => {
                if (projection[current]) {
                  final[current] = el[current]
                }
                return final
              }, {})
            }

            if (Object.prototype.hasOwnProperty.call(projection, '_id')) {
              if (!projection._id) {
                delete retVal._id
              }
            }

            return retVal
          })
        } else {
          return results
        }
      })
  }

  /**
   * Same as `collection.find()` but the promise resolve to
   * the first document matching the `query`
   * with the specified `projection` and `options`.
   *
   * @param {Object} [query={}]
   * @param {Object} [projection=undefined]
   * @param {Object} [options=undefined]
   * @returns Promise<Object[]>
   * @memberof ReactiveCollection
   */
  findOne (query = {}, projection = undefined, options = undefined) {
    return this.find(query, projection, { ...options, limit: 1 })
      .then(results => {
        return results[0]
      })
  }

  /**
   * Find all documents matching a query and modify their content.
   *
   * @param {Object} query Specifies selection filter using query operator
   * @param {Object} replace Specifies the modifications to apply.
   * Can be a document or a set of of update operators.
   * See [modifyjs](https://github.com/lgandecki/modifyjs) for more infos.
   * @param {Object} [options=undefined] Optional. `limit`, `sort`, `skip` will be applied to search documents.
   * If the `upsert` option is used, create the document if no match is found.
   * @returns Promise
   * @memberof ReactiveCollection
   * @example
   * // Modify all documents containing {hasSuperPower: true}, to add a property "isLuckyGuy" set to "true"
   * collection.update({
   *     hasSuperPower: false
   *   }, {
   *     $set: {
   *       isLuckyGuy: true
   *     }
   *   })
   *
   * // If no Bruce BANNER, create a document containing :
   * // { firstname: 'Bruce', lastname: 'BANNER', hasSuperPower: true }
   * collection.update({
   *     firstname: 'Bruce',
   *     lastname: 'BANNER',
   *   }, {
   *     hasSuperPower: true
   *   }, {
   *     upsert: true
   *   })
   */
  update (query, replace, options = undefined) {
    return new Promise((resolve, reject) => {
      if (typeof replace !== 'object' && !Array.isArray(replace)) {
        return reject(new Error('"query" must be an object'))
      }

      options = options || {}

      this.find(query, undefined, options)
        .then(results => {
          if (results.length === 0) {
            if (options.upsert) {
              return this.insertOne(modify(query, replace))
            }
            return resolve()
          } else {
            results.forEach((result, idx) => {
              // Get modified result
              const modified = modify(result, replace)

              // then apply modifications to reference object
              // (delete old properties then add new ones)
              Object.keys(result).forEach(key => {
                if (key !== '_id') { // Keep _id
                  delete result[key]
                }
              })

              Object.keys(modified).forEach(key => {
                if (key !== '_id') { // Keep _id
                  result[key] = modified[key]
                }
              })
            })
          }
          this._notifyChangesForIds(results.map(el => el._id), 'update')
        })
        .then(() => {
          return resolve()
        })
    })
  }

  /**
   * Same as `collection.update()` but only the first matching document will be updated.
   *
   * @param {Object} query Specifies selection filter using query operator
   * @param {Object} replace Specifies the modifications to apply.
   * Can be a document or a set of of update operators.
   * See [modifyjs](https://github.com/lgandecki/modifyjs) for more infos.
   * @param {Object} [options=undefined] Optional. `limit`, `sort`, `skip` will be applied to search documents.
   * If the `upsert` option is used, create the document if no match is found.
   * @returns Promise
   * @memberof ReactiveCollection
   */
  updateOne (query, replace, options = undefined) {
    return this.update(query, replace, { ...options, limit: 1 })
  }

  /**
   * Same as `collection.update()`
   *
   * @param {Object} [query={}] Specifies selection filter using query operator
   * @param {Object} replace Specifies the modifications to apply.
   * Can be a document or a set of of update operators.
   * See [modifyjs](https://github.com/lgandecki/modifyjs) for more infos.
   * @param {Object} [options=undefined] Optional. `limit`, `sort`, `skip` will be applied to search documents.
   * If the `upsert` option is used, create the document if no match is found.
   * @returns Promise
   * @memberof ReactiveCollection
   */
  updateMany (query, replace, options = undefined) {
    return this.update(query, replace, options)
  }

  /**
   * Remove each documents matching `query`.
   *
   * @param {Object} [query={}] Specifies selection filter using query operator.
   * @param {Object} [options={}] Optional. Use `{justOne: true}` to remove just one document.
   * @returns Promise
   * @memberof ReactiveCollection
   */
  remove (query = {}, options = {}) {
    return this.find(query, undefined, options.justOne ? { limit: 1 } : undefined)
      .then(results => {
        const ids = []

        results.forEach(result => {
          const index = this._content.findIndex(el => el._id === result._id)

          if (index >= 0) {
            ids.push(result._id)
            this._content.splice(index, 1)
          }
        })

        this._notifyChangesForIds(ids, 'remove')
      })
  }

  /**
   * This method generate a unique id (in the current collection) for the document.
   *
   * @returns String
   * @memberof ReactiveCollection
   */
  _objectId () {
    return `${this._lastId++}`
  }

  /**
   *
   *
   * @param {String[]} ids
   * @param {String} operationType
   * @memberof ReactiveCollection
   */
  _notifyChangesForIds (ids, operationType) {
    if (this._notifyTimeout) {
      clearTimeout(this._notifyTimeout)
      this._notifyTimeout = null
    }

    const data = ids.reduce((final, current) => {
      const updated = this._content.find(el => (el || {})._id === current)
      if (updated) {
        final.push({
          collection: this._name,
          _id: current,
          operationType,
          fullDocument: updated
        })
      } else {
        final.push({
          collection: this._name,
          _id: current,
          operationType
        })
      }
      return final
    }, [])

    this._changesToNotify = [
      ...this._changesToNotify.filter(el => ids.indexOf(el._id) < 0),
      ...data
    ]

    this._notifyTimeout = setTimeout(() => {
      this._watchers.forEach((callback, watcher) => {
        callback.call(watcher, this._changesToNotify)
      })
      this._changesToNotify = []
    }, 200)
  }

  _elementIsValidForQuery (elementToTest, query) {
    // Instead of verifying that every element is matching,
    // we search if one is not matching
    const queryDoNotMatch = Object.keys(query).some(attribute => {
      const currentSubQuery = query[attribute]

      // Do not match if currentSubQuery isn't null
      // and current element to test hasn't the searched property
      if (currentSubQuery && !Object.prototype.hasOwnProperty.call(elementToTest, attribute)) {
        return true
      }

      if (currentSubQuery && typeof currentSubQuery === 'object') {
        // Instead of verifying that every element is matching,
        // we search if one is not matching
        const subQueryDoNotMatch = Object.keys(currentSubQuery).some(subAttribute => {
          switch (subAttribute) {
            case '$lte':
              return elementToTest[attribute] > currentSubQuery[subAttribute]
            case '$lt':
              return elementToTest[attribute] >= currentSubQuery[subAttribute]
            case '$gte':
              return elementToTest[attribute] < currentSubQuery[subAttribute]
            case '$gt':
              return elementToTest[attribute] <= currentSubQuery[subAttribute]
            case '$ne':
              return elementToTest[attribute] === currentSubQuery[subAttribute]
            case '$eq':
              return elementToTest[attribute] !== currentSubQuery[subAttribute]
            case '$in':
              return currentSubQuery[subAttribute].indexOf(elementToTest[attribute]) < 0
            case '$nin':
              return currentSubQuery[subAttribute].indexOf(elementToTest[attribute]) >= 0
            case '$exists':
              if (currentSubQuery[subAttribute]) {
                return elementToTest[attribute] === undefined
              } else {
                return elementToTest[attribute] !== undefined
              }
            default:
              return !this._elementIsValidForQuery(elementToTest[attribute], currentSubQuery)
          }
        })

        return subQueryDoNotMatch
      }
      return elementToTest[attribute] !== currentSubQuery
    })

    return !queryDoNotMatch
  }

  _orderByManyProperties (a, b, sort, keys, keyIndex) {
    const currentKey = keys[keyIndex]
    if (a[currentKey] > b[currentKey]) {
      return sort[currentKey] > 0 ? 1 : -1
    } else if (a[currentKey] < b[currentKey]) {
      return sort[currentKey] < 0 ? 1 : -1
    } else if (keyIndex >= keys.length) {
      return 0
    } else {
      return this._orderByManyProperties(a, b, sort, keys, keyIndex + 1)
    }
  }
}

module.exports = ReactiveCollection
