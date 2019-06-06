
const TIMEOUT=10 *10000
var WebSocketServer = require('ws').Server
var cards = {};
var cmdList = {}
var config = require('./config')
var http = require('http')
var restartNotification = config.restartNotification
var restartReq = function(cardId){
  if(!restartNotification.host)
    return
  var options = {
    host: restartNotification.host,
    port: restartNotification.port,
    path: restartNotification.path + cardId
  }
  var req = http.request(options, function(res) {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      console.log('BODY: ' + chunk);
    });
  });

  req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
  });

  req.end();
}

function createServer(server) {
  var wss = new WebSocketServer({server: server});
  wss.on('connection', function(ws) {
    console.log('webViewServer.js: connection');
    var cardId = null
    ws.on('message', function(message) {
      console.log('webViewServer.js: message',message);
      var data
      try{
        // Question: Why is this necessary should the message be json
        if(typeof message === 'string' && message.match(/^\w\w\w-\w\w\w-\w\w\w\w\w$/)){
          data = {cardId: message};
        } else if (!message) {
          console.log('ping');
          return;
        } else {
          var encoded = message.toString('hex');
          console.log('encoded', encoded);
          data = JSON.parse(message);
        }
      }catch(e){
        console.log('receive: '+message,data,e)
        return
      }
      var obj = cmdList[data._id]
      if(data.cardId){
        cardId = data.cardId;
        if(cards[cardId])
          cards[cardId].close();
        cards[cardId]= ws;
        console.log(new Date(),cardId,'connected');
      }
      else if(data['_type'] =='restart'){
        console.log(new Date(),cardId,'restart');
        restartReq(cardId)
      }else if(data['_type'] =='error'){
        if(obj && obj.cb instanceof Function){
          obj.status ='error'
          obj.cb(new Error(data['message']))
        }
      }else if(data['_type'] =='success'){
        if(obj && obj.cb instanceof Function){
          obj.status ='success'
          obj.cb(null, data)
        }
      }else{
        if(obj && obj.cb instanceof Function){
          obj.status ='other'
          obj.cb(null, data)
        }
      }
    });
    ws.on('close', function() {
      console.error(new Date(),cardId,'closed');
      ws = null;
    });
  });
}
var uuid=require('node-uuid')
function send(cardId, data, cb){
  var commandId = uuid.v4();
  data._id = commandId
  var ws =cards[cardId];
  if(!ws)
    cb(new Error(cardId+' does not exist!'))
  else
    ws.send(JSON.stringify(data), function(err){
      if(err)
        cb(err)
      else{
        console.log(new Date(),cardId,'sent',data)
        var obj = cmdList[commandId] ={cb:cb, status:'sent'}
        setTimeout(function(){
          if(obj.status =='sent')
            obj.cb(new Error('timeout'))
          delete cmdList[commandId]
        },TIMEOUT)
      }
    });
}
module.exports = {createServer:createServer, send: send};
