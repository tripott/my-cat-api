require('dotenv').config()
const express = require('express')
const app = express()
let database = require('./data')
const {
  find,
  isEmpty,
  propOr,
  append,
  merge,
  not,
  isNil,
  filter,
  compose,
  reject,
  propEq,
  map,
  pathOr,
  split,
  head,
  last,
  path
} = require('ramda')

const bodyParser = require('body-parser')
const checkRequiredFields = require('./lib/check-required-fields')
const createMissingFieldsMsg = require('./lib/create-missing-field-msg')
const cleanObj = require('./lib/clean-obj')
const stringToNum = require('./lib/string-to-num')
const stringToBool = require('./lib/string-to-bool')
const nodeHTTPError = require('node-http-error')

const isCat = function(obj) {
  return obj.type === 'cat'
}
const isBreed = function(obj) {
  return obj.type === 'breed'
}
const isCatInDatabase = (catId, database) =>
  compose(
    not,
    isNil,
    find(cat => cat.id === catId),
    filter(propEq('type', 'cat'))
  )(database)

const isBreedInDatabase = (breedId, database) =>
  compose(
    not,
    isNil,
    find(breed => breed.id === breedId),
    filter(propEq('type', 'breed'))
  )(database)

app.use(bodyParser.json())

app.get('/', (req, res) => res.send('Welcome to the CATS api, meow.'))

app.get('/cats', (req, res, next) => {
  const isQueryTime = not(isNil(pathOr(null, ['query', 'filter'], req)))

  if (isQueryTime) {
    const filterArr = compose(
      split(':'),
      path(['query', 'filter'])
    )(req)
    const filterProp = head(filterArr) // 'isDeceased'
    const filterValue = compose(
      stringToBool,
      stringToNum
    )(last(filterArr))
    res.send(filter(propEq(filterProp, filterValue), database))
  } else {
    console.log('im in the else')
    res.send(filter(propEq('type', 'cat'), database))
  }
})

app.get('/breeds', (req, res, next) => {
  const isQueryReq = not(isNil(pathOr(null, ['query', 'filter'], req)))
  // if req.query.filter exists:
  if (isQueryReq) {
    // split key value pair from filter value in req.query object
    const [key, value] = compose(
      split(':'),
      path(['query', 'filter'])
    )(req)

    const filteredBreeds = compose(
      filter(propEq(key, value)),
      filter(propEq('type', 'breed'))
    )(database)

    // filter based on key value pair and breed Type
    res.send(filteredBreeds)
  } else res.send(filter(propEq('type', 'breed'), database))
})

app.delete('/cats/:catname', function(req, res, next) {
  if (isCatInDatabase(req.params.catname, database)) {
    database = reject(cat => cat.id === req.params.catname, database)
    res.status(200).send('cat deleted')
  } else {
    next(new nodeHTTPError(404, 'Cat not found'))
  }
})

app.delete('/breeds/:breedId', function(req, res, next) {
  // if  breedId in breeds
  if (isBreedInDatabase(req.params.breedId, database)) {
    //   reject breed w/ breedId from breeds
    const breedId = path(['params', 'breedId'], req)

    database = reject(propEq('id', breedId), database)
    res.status(200).send(`${breedId} deleted`)
  } else res.send(new nodeHTTPError(404, 'Breed not found. Please use a valid breed id.')) // else no catname -> 404 error
})

app.post('/cats', function(req, res, next) {
  const newCat = propOr({}, 'body', req)

  if (isEmpty(newCat)) {
    // No cat in request body, send the 400 response status code and message to the client.
    next(
      new nodeHTTPError(
        400,
        `missing cat in request body. use a header of 'Content-Type' with a value of 'application/json'.  Be sure to provide valid JSON to represent the cat you wish to add.`
      )
    )
    return
  }

  const missingFields = checkRequiredFields(
    ['breed', 'name', 'owner', 'age'],
    newCat
  )
  if (not(isEmpty(missingFields))) {
    // missing required fields
    next(new nodeHTTPError(400, `${createMissingFieldsMsg(missingFields)}`))
    return
  }

  const newNewCat = merge(cleanObj(['breed', 'name', 'owner', 'age'], newCat), {
    id: newCat.name,
    type: 'cat'
  })
  database = append(newNewCat, database)
  res.status(201).send({ ok: true, data: newNewCat })
})

app.post('/breeds/:breedId', function(req, res, next) {
  // creates a new breed
  // check to see if breed in req.body
  const newBreed = propOr([], 'body', req)
  console.log(newBreed)
  if (isEmpty(newBreed)) {
    //  400 if not
    next(
      new nodeHTTPError(
        400,
        `Missing breed in request body. Please make sure you are sending a request with a 'Content-Type' of 'application/JSON' in the header.`
      )
    )
    return
  }
  //  check to see if req props are in req.body object
  const reqProps = ['type', 'id', 'description']
  if (isEmpty(checkRequiredFields(reqProps, newBreed))) {
    // if there, clean unwanted props off object
    const cleanedNewBreed = cleanObj(reqProps, newBreed)
    database = append(cleanedNewBreed, database)
    res.send(`${cleanedNewBreed.id} was added to the cat database. Meow.`)
    return
  } else next(new nodeHTTPError(400, createMissingFieldsMsg(checkRequiredFields(reqProps, newBreed))))
})

app.get('/cats/:catname', (req, res, next) => {
  isCatInDatabase(req.params.catname, database)
    ? res.send(find(cat => cat.id === req.params.catname, database))
    : next(
        new nodeHTTPError(404, 'Cat not found', {
          huh: 'dude, what are you doing?'
        })
      )
})

app.get('/breeds/:breedid', function(req, res, next) {
  if (isBreedInDatabase(req.params.breedid, database)) {
    res.send(find(breed => breed.id === req.params.breedid, database))
  } else next(new nodeHTTPError(404, 'Breed not found. Please enter a valid breedid into the URL'))
})
app.put('/cats/:catname', function(req, res, next) {
  // TODO: DONE No cat in request body, send the 400 response status code and message to the client.
  // TODO: DONE Missing required fields send 400 response
  // TODO: DONE Clean unnecessary prop
  // TODO: id prop value in resource matches the name within in route/path

  const newCat = propOr({}, 'body', req)

  if (isEmpty(newCat)) {
    // No cat in request body, send the 400 response status code and message to the client.
    next(
      new nodeHTTPError(
        400,
        `missing cat in request body. use a header of 'Content-Type' with a value of 'application/json'.  Be sure to provide valid JSON to represent the cat you wish to add.`
      )
    )
    return
  }

  const missingFields = checkRequiredFields(
    ['id', 'type', 'breed', 'name', 'owner', 'age'],
    newCat
  )

  if (not(isEmpty(missingFields))) {
    // missing required fields
    next(new nodeHTTPError(400, `${createMissingFieldsMsg(missingFields)}`))
    return
  }

  if (not(propEq('id', req.params.catname, newCat))) {
    // something is wrong send a 400
    next(
      new nodeHTTPError(
        400,
        `The id of the cat in the URI path does not match the id property value. Ensure the id of the cat in the URI and the id value match and resend the request.`
      )
    )
    return
  }

  const newNewCat = cleanObj(
    ['breed', 'name', 'owner', 'age', 'id', 'type'],
    newCat
  )

  if (isCatInDatabase(req.params.catname, database)) {
    database = map(
      obj =>
        obj.id === req.params.catname && obj.type === 'cat' ? newNewCat : obj,
      database
    )
    res.status(200).send('the cat was updated.')
  } else {
    next(
      new nodeHTTPError(404, 'Cat not found', {
        huh: 'dude, what are you doing?'
      })
    )
  }
})

app.put('/breeds/:breedId', function(req, res, next) {
  // completely replaces
  // check if breed empty
  const newBreed = propOr([], 'body', req)
  console.log(newBreed)
  if (isEmpty(newBreed)) {
    //   400 error otherwise
    next(
      new nodeHTTPError(
        400,
        `Missing breed in request body. Please make sure that the header has a 'Content-Type' of 'application/JSON' and is formatted correctly as a JSON object.`
      )
    )
    return
  }
  console.log(
    'breed id',
    newBreed.id,
    'in database?',
    isBreedInDatabase(newBreed.id, database)
  )
  // check if breed in database
  if (!isBreedInDatabase(newBreed.id, database)) {
    //   404 otherwise
    next(
      new nodeHTTPError(
        404,
        `${
          newBreed.id
        } is not currently in the database. If you wish to add a new breed instead of modify an existing one, please use POST.`
      )
    )
    return
  }
  // check for required fields
  const reqFields = ['type', 'id', 'description']
  if (isEmpty(checkRequiredFields(reqFields, newBreed))) {
    // clean object and send 200 OK status
    // update database with cleaned object
    const cleanedNewBreed = cleanObj(reqFields, newBreed)
    database = map(
      breed => (breed.id === newBreed.id ? cleanedNewBreed : breed),
      database
    )
    res.status(200).send(`${cleanedNewBreed.id} was updated.`)
  } //   400 otherwise checkRequiredFields used for message
  else
    next(
      new nodeHTTPError(
        400,
        createMissingFieldsMsg(checkRequiredFields(reqFields, newBreed))
      )
    )
})

app.use(function(err, req, res, next) {
  console.log('TROUBLE IN RIVER CITY, meow.', err)
  next(err)
})

app.use(function(err, req, res, next) {
  res.status(err.status || 500)
  res.send(err)
})

app.listen(
  process.env.PORT || 5555,
  process.env.HOST || '127.0.0.1',
  function() {
    console.log(
      'API is up, meow!!!',
      `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 5555}`
    )
  }
)
