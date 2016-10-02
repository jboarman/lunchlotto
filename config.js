'use strict'

module.exports = {
  dbUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/lunchlotto',
  appPort: process.env.PORT || 8081
}
