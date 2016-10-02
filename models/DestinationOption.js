'use strict'

module.exports = class DestinationOption {
  constructor (destinationOption) {
    if (!destinationOption) {
      return
    }

    this.lunchCrewName = destinationOption.lunchCrewName
    this.name = destinationOption.name
  }

  validate () {
    return !!this.name && !!this.lunchCrewName
  }
}
