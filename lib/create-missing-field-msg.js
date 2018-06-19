const { compose, concat, join } = require('ramda')

module.exports = missingKeys =>
  compose(
    concat("You're missing the following fields in your request body: "),
    join(', ')
  )(missingKeys)
