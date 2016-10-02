'use strict'

module.exports = class DestinationOption {
  constructor (destinationOption) {
    if (!destinationOption) {
      return
    }

    this.lunchCrewName = destinationOption.lunchCrewName
    this.destination = destinationOption.destination
  }

  validate () {
    return !!this.destination && !!this.lunchCrewName
  }
}
