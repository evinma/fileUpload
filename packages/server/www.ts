// const http = require('http')
// const app = require('./app')
import http from 'http'
import app from './app'
const PORT = process.env.port

const server = http.createServer(app)
server.listen(PORT, () => {
    console.log(`start app by ${PORT}!`)
})