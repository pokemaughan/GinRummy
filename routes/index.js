var express = require('express');
var router = express.Router();
var cards = require('node-of-cards');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database/data.sqlite');

var id = "";
/* GET home page. */
router.get('/', function(req, res, next) {
	res.sendFile('homePage.html', { root: 'public' });
});

var playerWaiting = [];
var msgforplayer = [];

router.get('/login', function(req, res, data){
	var name = req.query.username;
	var pass = req.query.password;
	db.get("SELECT * FROM User WHERE username=?", [name], function(err, row){
		if(err)
			res.sendStatus(500);
		if(row === undefined){
			db.run("INSERT INTO User (username,password) VALUES (?,?)",[name,pass],function(err,row){
				if(err)
					res.sendStatus(403);
				else
					res.sendFile('ginRummy.html', { root: 'public' });
			});
		}else if(row.password == pass)
			res.sendFile('ginRummy.html', { root: 'public' });
		else
			res.sendStatus(404);
	});
});

router.post('/startGame', function(req,res,data){
	var p1 = req.body.username;
	db.get("SELECT * FROM User WHERE username=?", [p1], function(err,row){
		if(err)
			console.log(err);
		else if(row === undefined)
			res.sendStatus(403);
		else{
			if(playerWaiting.length == 0){
				playerWaiting.push(p1);
				res.sendStatus(202);
				return;
			}else{
				var p2 = playerWaiting.shift();
				
				cards.shuffle( function(err,cdata) {
					var deckid = cdata.deck_id;
					if(err)
						console.log("err with shuf");
					db.run("INSERT INTO Game (deckid,player1,player2) VALUES (?,?,?)",[deckid,p1,p2], function(err,row){
						lastd = this.lastID;
						db.run("UPDATE User SET currentGame=? WHERE username=?", [lastd,p1], function(err, row){
							db.run("UPDATE User SET currentGame=? WHERE username=?", [lastd,p2], function(err,row){
								cards.draw(function(err,cddata){
									var useme = cddata.cards[0].code;
									cards.addToPile('discard',[useme],function(err,cdddata){
										msgforplayer.push(p2);
										res.json({
											game: lastd,
											deck: deckid
										});
									});
								});
							});
						});
					});
				});
			}
		}
	});
});

router.get('/deal', function(req,res,data){
	var p1 = req.query.username;
	var deck = req.query.deckid;
	db.get("SELECT currentGame FROM User WHERE username=?", [p1], function(err, row){
		if(row === undefined)
			res.sendStatus(403);
		else{
			cards.draw({number_of_cards:10}, function (err,data) {
				res.json(data);
			});
		}
	});
});

router.get('/drawFromDiscard', function(req,res,data){
	var p1 = req.query.username;
	var deck = req.query.deckid;
	//could add checking for if the player is a player if in a game etc. etc.
	cards.setDeck(deck);
	cards.drawFromPile('discard', function(err,data) {
		res.json(data);
	});
});

router.get('/drawCard', function(req,res,next) {
	var p1 = req.query.username;
	var deck = req.query.deckid;

	cards.setDeck(deck);
	cards.draw(function(err, data) {
		res.json(data);
	});
});

router.get('/discard', function(req,res,next) {
	var p1 = req.query.username;
	var deck = req.query.deckid;
	var gamed = req.query.gameid;
	console.log(gamed);
	var card = req.query.card;
	console.log("in discard");
	cards.setDeck(deck);
	cards.addToPile('discard', [card],function(err,data) {
		db.get("SELECT * FROM Game WHERE GameID=?", [gamed], function(err,row){
			var plar1 = row.player1;
			var plar2 = row.player2;
			if(plar1 == p1){
				db.run("UPDATE Game SET turn=? WHERE GameID=?", [2,gamed],function(err,row){
					msgforplayer.push(plar2);
					res.json(data);
				});
			}else if(plar2 == p1){
				db.run("UPDATE Game SET turn=? WHERE GameID=?", [1,gamed], function(err,row){
					msgforplayer.push(plar1);
					res.json(data);
				});
			}else{
				res.sendStatus(404);
			}
		});
	});
});

router.get('/getDiscard', function(req,res,data){
	//draw from discard then add it back	
	var deck = req.query.deckid;
	var card = req.query.card;

	cards.setDeck(deck);
	cards.drawFromPile('discard', function(err,cdata){
		if(cdata === undefined){
			res.sendStatus(500);
			console.log("get discard probs");
			return;
		}
		var car = cdata.cards[0];
		cards.addToPile('discard', [car.code], function(err,ddata){
			res.json(car);
		});
	});
});

router.get('/status', function(req, res, data){
	var user = req.query.username;
	var gameid = req.query.game;

	if(msgforplayer.length > 0){
		for(var i = 0; i < msgforplayer.length; i++){
			if(msgforplayer[i] == user){
				msgforplayer.splice(i,1);
				if(gameid === undefined){ //join game
					db.get("SELECT * FROM User WHERE username=?", [user], function(err, row){
						gameid = row.currentGame;
						console.log("here here now " + gameid);
						db.get("SELECT * FROM Game WHERE GameID=?", [gameid], function(err, row){
							if(row === undefined)
								console.log("darn row");
							res.json({
								game:gameid,
								deck:row.deckid
							});
						});
					});
				}else{//turn?
					db.get("SELECT * FROM Game WHERE player1=? OR player2=?", [user, user], function(err, row){
						//ADD if turn = 0 then the game is over.
						if(row.player1 == user){
							res.sendStatus(200);
						}else{
							res.sendStatus(200);
						}
					});
				}
				break;
			}
		}
	}else
		res.sendStatus(404); //let them know theres no message
});


module.exports = router;
