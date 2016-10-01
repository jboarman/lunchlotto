'use strict'

module.exports = class LunchCrew {
  constructor (lunchCrew) {
    if (!lunchCrew) {
      return
    }

    this._id = lunchCrew._id
    this.destinationOptions = lunchCrew.destinationOptions || []
    this.name = lunchCrew.name
    this.currentWinningDestination = lunchCrew.currentWinningDestination
  }

  validate () {
    return !!this.name
  }
}
