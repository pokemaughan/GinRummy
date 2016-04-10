var express = require('express');
var router = express.Router();
var cards = require('node-of-cards');
//var mongoose = reguire('mongoose');

var id = "";
/* GET home page. */
router.get('/', function(req, res, next) {
	res.sendFile('ginRummy.html', { root: 'public' });
});

router.get('/shuffle', function(req,res,next) {
	cards.shuffle( function(err,data) {
		id = data.deck_id;
		res.json(data);
	});
});

router.get('/dealCards', function(req,res,next) {
	cards.draw({number_of_cards:10}, function (err, data) {
		res.json(data);
	});
});

router.get('/drawCard', function(req,res,next) {
	cards.draw(function(err, data) {
		res.json(data);
	});
});

router.get('/discard', function(req,res,next) {
	cards.addToPile('dcard', [req.query.token], function(err,data) {
		res.json(data);
	});
});

router.get('/drawPile', function(req,res,next) {
	cards.drawFromPile('dcard', function(err,data) {
		res.json(data);
	});
});

module.exports = router;
