# reactive-db

**reactive-db** is an in memory documents oriented reactive NoSQL database with MongoDB syntax (not full support). No external software needed !

What all these words means :

* **database** : you can store data
* **in memory** : your datas are stored in the host memory. So, it is neither meant to store huge amount of data, nor indexed data.
* **document oriented** : your data don't have to be flatten to a table. You just store any object in collections.
* **NoSQL** : No SQL syntax is used to query the BDD
* **MongoDB syntax** : Use MongoDB query syntax to create, read, update and remove data inside your collections of data. (aggregation not supported)
* **reactive** : You can subscribe/unsubscribe to any collection, so if documents are created, updated, or removed, you'll be notified.

## Limitations

**reactive-db** is not performance optimised. It's goal is to provide an easy way to store and query with a notification mecanism. It may be slow with lots of datas stored. However, you can store any amout of data as long as there's enough free memory in the host system.

## Installation

```bash
yarn add reactive-db
```

or

```bash
npm install reactive-db
```

## Usage

### Class: `ReactiveDatabase`

A database contains many collections. They are instanciated with `new ReactiveDatabase()`.

```javascript
const ReactiveDatabase = require('reactive-db')
const db = new ReactiveDatabase()
```

#### `db.connect()`

* Returns: `Promise`

Only for compatibility with MongoDB API. `db.connect()` just return a resolved `Promise`.

#### `db.showCollections()`

* Returns: `String[]`

Get every known collections name.

#### `db.getCollection(collectionName)`

* Arguments
	* `collectionName` (`String`) : Name of the collection to get.
* Returns: `ReactiveCollection`

The first time `db.getCollection(collectionName)` is called, the collection named `collectionName` will be created and returned. The other times, the collection will just be returned.

```javascript
const collection = db.getCollection('superheroes')
```

### Class: `ReactiveCollection`

A `ReactiveCollection` is where documents are stored. Documents are JS objects. Each modification inside a collection can be notified.

#### `collection.subscribe(watcher, callback)`

* Arguments:
	* `watcher` (`Any`): The instance that will watch for updates.
	* `callback` (`Function`): the callback which will be called if something happens.
* Returns: `undefined`

When one or many documents of the collection is created, updated or removed `callback` will be called with `watcher` as its `this`.

**NOTE:** A collection can have many watchers. A watcher can subscribe to many collection. A watcher can subscribe only once to a collection (only the latest subscription will be retain).

```javascript
collection.subscribe(this, changes => {
  console.log(`${changes.length} documents have been created, updated or removed.`)

  changes.forEach(change => {
    console.log(`[${change.collection}] The document _id "${change._id}" is marked with operation type "${change.operationType}".`) // [superheroes] The document _id "1" is marked with operation type "insert".
    if (change.fullDocument !== undefined) {
      // fullDocument only for "insert" or "update" operationType.
      console.log(`New content: ${change.fullDocument}`)
    }
  })
})
```

#### `collection.unsubscribe(watcher)`

* Arguments:
	* `watcher` (`Any`): The instance that is watching for updates.
* Returns: `undefined`

Remove `watcher` fore the collections watchers.

```javascript
collection.unsubscribe(this)
```

#### `collection.count()`

* Returns: `Promise`

Returns a promise that resolves to the number of documents inside the collection.

```javascript
const documentsCount = await collection.count()
console.log("There are", documentsCount, "inside this collection")
```

#### `collection.insert(data)`

* Arguments:
	* `data` (`Object` or `Object[]`): The document(s) to insert
* Returns: `Promise`

Insert one or many documents in the collection. Once done, the promise is resolve. Use the same syntax as `collection.insertOne()` or `collection.insertMany()`.

#### `collection.insertOne(data)`

* Arguments:
	* `data` (`Object`): The document to insert
* Returns: `Promise`

Insert one document in the collection. Once done, the promise is resolve.

```javascript
collection.insertOne({
  firstname: 'Peter',
  lastname: 'PARKER',
  age: 25,
  hasSuperPower: true
})
```

#### `collection.insertMany(data)`

* Arguments:
	* `data` (`Object[]`): The documents to insert
* Returns: `Promise`

Insert many documents in the collection. Once done, the promise is resolve.

```javascript
collection.insertMany([
    {
      firstname: 'Tony',
      lastname: 'STARK',
      hasSuperPower: false
    },
    {
      firstname: 'Bruce',
      lastname: 'BANNER',
      hasSuperPower: true
    }
  ])
```

#### `collection.find([query, [projection, [options]]])`

* Arguments:
	* `query` (`Object`): Optional. Specifies selection filter using query operator. If not provided, default is `{}`.
	* `projection` (`Object`): Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.
	* `options` (`Object`): Optional. Used to sort, limit or skip data.
* Returns: `Promise`

Find all documents matching a query.

```javascript
// find all documents
collection.find()

// find all documents for Tony STARK
collection.find({ firstname: 'Tony', lastname: 'STARK' })

// find all firstnames, in descending order. Results limited to 2nd - 11th
collection.find({}, { _id: 0, firstname}, { sort: { firstname: -1 }, limit: 10, skip: 1 })
```

#### `collection.findOne([query, [projection, [options]]])`

* Arguments:
	* `query` (`Object`): Optional. Specifies selection filter using query operator. If not provided, default is `{}`.
	* `projection` (`Object`): Optional. Specifies the fields to return in the documents that match the query filter. To return all fields in the matching documents, omit this parameter.
	* `options` (`Object`): Optional. Used to sort, limit or skip data.
* Returns: `Promise`

Same as `collection.find()` but the promise resolve to the first document matching the `query` with the specified `projection` and `options`.

#### `collection.update(query, update, [options])`

* Arguments:
	* `query` (`Object`): Specifies selection filter using query operator.
	* `update` (`Object`): Specifies the modifications to apply. Can be a document or a set of of update operators. See [modifyjs](https://github.com/lgandecki/modifyjs) for more infos.
	* `options` (`Object`): Optional. `limit`, `sort`, `skip` will be applied to search documents. If the `upsert` option is used, create the document if no match is found.
* Returns: `Promise`

Find all documents matching a query and modify their content. 

```javascript
// Modify all documents containing {hasSuperPower: true}, to add a property "isLuckyGuy" set to "true"
collection.update({
    hasSuperPower: false
  }, {
    $set: {
      isLuckyGuy: true
    }
  })

// If no Bruce BANNER, create a document containing :
// { firstname: 'Bruce', lastname: 'BANNER', hasSuperPower: true }
collection.update({
    firstname: 'Bruce',
    lastname: 'BANNER',
  }, {
    hasSuperPower: true
  }, {
    upsert: true
  })
```

#### `collection.updateMany(query, update, [options])`

Same as `collection.update()`

#### `collection.updateOne(query, update, [options])`

Same as `collection.update()` but only the first matching document will be updated.

#### `collection.remove(query, [options])`

* Arguments:
	* `query` (`Object`): Specifies selection filter using query operator.
	* `options` (`Object`): Optional. Use `{justOne: true}` to remove just one document.
* Returns: `Promise`

Remove each documents matching `query`.

#### `Promise.prototype.toArray()`

For compatibility with MongoDB API, this library add a `toArray()` method to the `Promise` prototype. It just return the current `Promise`

```javascript
collection.find().toArray()
// is equivalent to
collection.find()
```
### Query operators

`reactive-db` support some of MongoDB query operators, incluing :


* `$eq`: Matches values that are equal to a specified value.
* `$gt`: Matches values that are greater than a specified value.
* `$gte`: Matches values that are greater than or equal to a specified value.
* `$in`: Matches any of the values specified in an array.
* `$lt`: Matches values that are less than a specified value.
* `$lte`: Matches values that are less than or equal to a specified value.
* `$ne`: Matches all values that are not equal to a specified value.
* `$nin`: Matches none of the values specified in an array.
* `$exists`: Matches documents that have the specified field.

## Licence

Copyright (c) 2020 René BIGOT

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

