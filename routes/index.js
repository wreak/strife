var express = require('express');
var router = express.Router();
var s = require('../webViewServer');

router.post('/command/:cardId', function(req, res) {
  var cardId = req.params.cardId;
  var data = req.body;
  console.log('index.js', data);
  s.send(cardId, data, function(err, receivedData){
    if(err){
      res.status(500).send(err.message)
      console.error(new Date(),cardId, err);
    }else
      console.log('receivedData', receivedData);
      res.json(receivedData)
  });
});



module.exports = router;
