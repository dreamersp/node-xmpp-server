'use strict';

var util = require('util')
  , WebSocketServer = require('ws').Server
  , WsSocket = require('./socket')
  , CS2Server = require('../c2s/server')
  , C2SStream = require('../c2s/stream')
  , debug = require('debug')('xmpp:server:websocket')
  , https = require('https')
  , fs = require('fs')


function WsServer(options) {
  this.wsoptions = options || {}

  if (this.wsoptions.autostart !== false) {
    this.listen()
  }

  // set autostart to false, to prevent the C2S Server
  // from starting a TCP listener
  this.wsoptions.autostart = false

  CS2Server.call(this, options)
}

util.inherits(WsServer, CS2Server)

WsServer.prototype.C2SStream = C2SStream

WsServer.prototype.listen = function() {
  var self = this

  if(self.wsoptions.tls){
      var tlsoptions = {
          key: fs.readFileSync(self.wsoptions.tls.keyPath),
          cert: fs.readFileSync(self.wsoptions.tls.certPath)
      };

      var server = https.createServer(tlsoptions);

      this.wss = new WebSocketServer({
          server: server
      })
      server.listen(self.wsoptions.port, self.wsoptions.bindAddress);
  }else {
      this.wss = new WebSocketServer({
          port: self.wsoptions.port
      })
  }

  this.wss.once('listening', function() {
    self.emit('online')
  })

  this.wss.once('error', function(error) {
    self.emit('error', error)
  })

  this.wss.on('connection', function (socket) {
    debug('websocket connection')
    var wsSocket = new WsSocket()
    wsSocket.init(socket)
    self.acceptConnection(wsSocket)
  })
}

WsServer.prototype.shutdown = function(callback) {
    debug('shutdown')
    // we have to shutdown all connections
    this.emit('shutdown')
    // shutdown server
    this.wss.close()
    if (callback) {
      callback()
    }
}

module.exports = WsServer
