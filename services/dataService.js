'use strict'

const MongoClient = require('mongodb').MongoClient

const LunchCrew = require('./../models/LunchCrew')

// Variable to store a handle to the connected DB instance.
let db = null

/**
 * Initializes a connection to the DB.
 *
 * @param url {string} The URL of the DB to connect to.
 *
 * @return {Promise}
 */
module.exports.connect = url => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve()
      return
    }

    MongoClient.connect(url, (err, dataBase) => {
      if (err) {
        reject(err)
        return
      }

      db = dataBase
      resolve()
    })
  })
}

/**
 * Gets LunchCrews.
 *
 * @return {Array} An array of LunchCrews.
 */
module.exports.getLunchCrews = () => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')

    collection.find().toArray((error, documents) => {
      if (error) {
        reject(error)
        return
      }

      resolve(documents.map(document => new LunchCrew(document)))
    })
  })
}

/**
 * Gets LunchCrew details.
 *
 * @return {Array} An array of LunchCrew.
 */
module.exports.getLunchCrew = (lunchCrewName) => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: lunchCrewName}

    collection.findOne(query)
      .then(document => {
        resolve(new LunchCrew(document))
      }).catch(error => {
        reject(error)
      })
  })
}

/**
 * Inserts a new LunchCrew.
 *
 * @param lunchCrew {LunchCrew} The LunchCrew to insert.
 *
 * @return {Promise}
 */
module.exports.insertLunchCrew = lunchCrew => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')

    collection.insert(lunchCrew, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    })
  })
}

/**
 * Inserts a new DestinationOption to a given LunchCrew.
 *
 * @param destinationOption {DestinationOption} The DestinationOption to insert.
 *
 * @return {Promise}
 */
module.exports.insertDestinationOption = destinationOption => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: destinationOption.lunchCrewName}
    let update = {$addToSet: { destinationOptions: destinationOption.destination }}

    collection.update(
      query,
      update,
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      })
  })
}

module.exports.pullLunchLottoLever = pullLunchLottoLever

/**
 * Gets Current Lunch Destination Winner for Lunch Crew.
 *
 * @return {Array} Current Destionation winner.
 */
function pullLunchLottoLever (lunchCrewName) {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: lunchCrewName}

    collection.findOne(query)
      .then(document => {
        // pick random number between 0 and length of destination options array.
        let random = Math.floor((Math.random() * document.destinationOptions.length) + 0)
        let winningOption = document.destinationOptions[random] // #magic!
        resolve(winningOption)
        return
      }).catch(error => {
        reject(error)
      })
  })
}

module.exports.setWinningDestination = setWinningDestination
/**
 * Update the current Winning Destination to a given LunchCrew.
 *
 * @param destinationOption {DestinationOption} The DestinationOption to insert.
 *
 * @return {Promise}
 */
function setWinningDestination (data) {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: data.lunchCrewName}
    let update = {$set: { currentWinningDestination: data.destination }}

    collection.update(
      query,
      update,
      (error, result) => {
        if (error) {
          reject(error)
          return
        }
        resolve(result)
      })
  })
}

/**
 * Gets Lunch Destinations for Lunch Crew.
 *
 * @return {Array} An array of DestionationOptions.
 */
module.exports.getDestinationOptions = (lunchCrewName) => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: lunchCrewName}
    console.log(query)

    collection.findOne(query)
      .then(document => {
        resolve(document.destinationOptions)
      }).catch(error => {
        reject(error)
      })
  })
}

/**
 * Gets Current Lunch Destination Winner for Lunch Crew.
 *
 * @return {Array} Current Destionation winner.
 */
module.exports.getCurrentDestinationWinner = (lunchCrewName) => {
  return new Promise((resolve, reject) => {
    let collection = db.collection('lunchCrew')
    let query = {name: lunchCrewName}

    collection.findOne(query)
      .then(document => {
        if (!!document.currentWinningDestination) {
          // return the current winning destination, _if_ it's populated
          resolve(document.currentWinningDestination)
        } else {
          // random magic to choose winning destination goes here, _if_ not already set
          pullLunchLottoLever(lunchCrewName)
            .then(winningOption => {
              setWinningDestination({lunchCrewName: lunchCrewName, destination: winningOption})
              .then(writeStatus => {
                resolve(winningOption)
              })
            })
        }
      }).catch(error => {
        reject(error)
      })
  })
}
