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

app.post('/lunchCrew', (request, response) => {
  var lunchCrew = new LunchCrew(request.body)

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
  var destinationOption = new DestinationOption(request.body)

  if (!destinationOption.validate()) {
    response.status(400).send(`Failed to validate ${JSON.stringify(request.body)}.`)
    return
  }

  dataService.insertDestinationOption(destinationOption)
    .then(() => {
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

io.of('/socket').on('connection', (socket) => {
  socket.emit('hello', {hello: 'Welcome to Lunch Lotto'})

  socket.on('update_destinations', (lunchCrew) => {
    dataService.getDestinationOptions(lunchCrew)
    .then(destinationOptions => {
      console.log(`Destinations for '${lunchCrew}' are '${destinationOptions}'`)
      socket.emit('update_destinations', destinationOptions)
    })
    .catch(error => {
      socket.status(500).send(error)
    })

    console.log(`Destinations were requested for '${lunchCrew}`)
  })
})
