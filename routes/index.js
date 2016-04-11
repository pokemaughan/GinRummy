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
	//console.log(req);
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
					db.run("INSERT INTO Game (deckid,player1,player2) VALUES (?,?,?)",[cdata.deck_id,p1,p2]);
					db.run("SELECT last_insert_rowid()", [], function(err, rowid){
						db.run("UPDATE User SET currentGame=? WHERE username=?", [this.lastID,p1]);
						db.run("UPDATE User SET currentGame=? WHERE username=?", [this.lastID,p2]);
						
						cards.setDeck(cdata.deck_id);
						cards.draw(function(err,cdata){
							cards.addToPile('discard',[cdata.cards[0].code],function(err,cdddata){});
						});
						msgforplayer.push(p2);
						res.json({
							game: this.lastID,
							deck: data.deck_id
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
			var game = row.currentGame;
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
		//console.log("draw card " + data.deck_id);
		res.json(data);
	});
});

router.get('/discard', function(req,res,next) {
	var p1 = req.query.username;
	var deck = req.query.deckid;
	var game = req.query.gameid;
	var card = req.query.card;

	cards.setDeck(deck);
	cards.addToPile('discard', [card],function(err,data) {
		db.run("SELECT * FROM Game WHERE GameID=?", [game], function(err,row){
			if(this.player1 == p1){
				db.run("UPDATE Game SET turn=? WHERE GameID=?", [2,game]);
				msgforplayer.push(this.player2);
			}else if(this.player2 == p1){
				db.run("UPDATE Game SET turn=? WHERE GameID=?", [1,game]);
				msgforplayer.push(this.player1);
			}
		});
		res.json(data);
	});
});

router.get('/getDiscard', function(req,res,data){
	//draw from discard then add it back	
	var deck = req.query.deckid;
	var card = req.query.card;

	cards.setDeck(deck);
	cards.drawFromPile('discard', function(err,cdata){
		cards.addToPile('discard', [cdata.cards[0].code], function(err,ddata){
			//do nothin
		res.json(cdata.cards[0]);
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
				if(gameid === undefined){ //
					db.get("SELECT * FROM User WHERE username=?", [user], function(err, row){
						db.get("SELECT * FROM Game WHERE GameID=?", [this.currentGame], function(err, row){
							res.json({game:this.GameID,deck:this.deckid});
								
						});
					});
				}else{
					db.get("SELECT * FROM Game WHERE player1=? OR player2=?", [user, user], function(err, row){
						//ADD if turn = 0 then the game is over.
						if(this.player1 == user){
							
							if(this.turn == 1)
								res.sendStatus(200);
							else 
								res.sendStatus(500);
						}else{
							if(this.turn == 2)
								res.sendStatus(200);
							else 
								res.sendStatus(500);
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
