'use strict'

require('dotenv').config()

const bodyParser = require('body-parser')
const express = require('express')
const morgan = require('morgan')

const config = require('./config')
const dataService = require('./services/dataService')

const LunchCrew = require('./models/LunchCrew')
const DestinationOption = require('./models/DestinationOption')

const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

app.use(express.static('public'))

app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

app.use(bodyParser.json())
app.use(morgan('dev'))

app.get('/', (request, response) => {
  response.send('lunchlotto')
})

app.get('/lunchCrew', (request, response) => {
  dataService.getLunchCrews()
    .then(destinationOptions => {
      response.send(destinationOptions)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

app.get('/lunchCrew/:lunchCrewName', (request, response) => {
  dataService.getLunchCrew(request.params.lunchCrewName)
    .then(lunchCrews => {
      response.send(lunchCrews)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

app.get('/lunchCrew/:lunchCrewName/destinations', (request, response) => {
  dataService.getDestinationOptions(request.params.lunchCrewName)
    .then(destinationOptions => {
      response.send(destinationOptions)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

app.get('/lunchCrew/:lunchCrewName/currentDestinationWinner', (request, response) => {
  dataService.getCurrentDestinationWinner(request.params.lunchCrewName)
    .then(destinationWinner => {
      response.send(destinationWinner)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

app.post('/lunchCrew/:lunchCrewName/currentDestinationWinner', (request, response) => {
  dataService.pullLunchLottoLever(request.params.lunchCrewName).then(winningOption => {
    dataService.setWinningDestination({lunchCrewName: request.params.lunchCrewName, destination: request.params.winningOption}).then(mongoReciept => {
      response.send(winningOption)
    }).catch(error => {
      response.status(500).send(error)
    })
  }).catch(error => {
    response.status(500).send(error)
  })
})

app.post('/lunchCrew', (request, response) => {
  const lunchCrew = new LunchCrew(request.body)

  if (!lunchCrew.validate()) {
    response.status(400).send(`Failed to validate ${JSON.stringify(request.body)}.`)
    return
  }

  dataService.insertLunchCrew(lunchCrew)
    .then(() => {
      response.sendStatus(200)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

app.post('/destination', (request, response) => {
  const destinationOption = new DestinationOption(request.body)

  if (!destinationOption.validate()) {
    response.status(400).send(`Failed to validate ${JSON.stringify(request.body)}.`)
    return
  }

  dataService.insertDestinationOption(destinationOption)
    .then(() => {
      dataService.getDestinationOptions(destinationOption.lunchCrewName).then(destinationOptions => {
        io.to(destinationOption.lunchCrewName).emit('destination options', destinationOptions)
      })
      response.sendStatus(200)
    })
    .catch(error => {
      response.status(500).send(error)
    })
})

dataService.connect(config.dbUrl)
  .then(() => {
    server.listen(config.appPort, () => {
      console.log(`App running on port ${config.appPort}`)
    })
  })
  .catch(error => {
    console.error(error)
  })

io.on('connection', (socket) => {
  socket.on('join room', (lunchCrewName) => {
    console.log(`join room ${lunchCrewName}`)

    dataService.getLunchCrew(lunchCrewName).then(data => {
      if (data == null) {
        // this is duplicate code plz remove
        dataService.insertLunchCrew({name: lunchCrewName}).then(
          data => {
            socket.join(lunchCrewName)
            dataService.getDestinationOptions(lunchCrewName).then(destinationOptions => {
              socket.emit('destination options', destinationOptions)
            })
            dataService.getCurrentDestinationWinner(lunchCrewName).then(winningOption => {
              io.to(lunchCrewName).emit('winning option', winningOption)
            })
          }
        )
      } else {
        socket.join(lunchCrewName)
        dataService.getDestinationOptions(lunchCrewName).then(destinationOptions => {
          socket.emit('destination options', destinationOptions)
        })
        dataService.getCurrentDestinationWinner(lunchCrewName).then(winningOption => {
          io.to(lunchCrewName).emit('winning option', winningOption)
        })
      }
    })
  })

  socket.on('pull lever', (lunchCrewName) => {
    console.log(`pull lever event called for the ${lunchCrewName}.`)
    dataService.pullLunchLottoLever(lunchCrewName).then(winningOption => {
      dataService.setWinningDestination({lunchCrewName: lunchCrewName, destination: winningOption}).then(mongoReciept => {
        io.to(lunchCrewName).emit('winning option', winningOption)
      })
    })
  })

  socket.on('add destination', (data) => {
    console.log(`add destination event called to add ${data.destination} option to ${data.lunchCrewName}.`)
    dataService.insertDestinationOption(data).then(mongoReciept => {
      dataService.getDestinationOptions(data.lunchCrewName)
        .then(options => {
          io.to(data.lunchCrewName).emit('destination options', data.destination)
        })
    })
  })
})

