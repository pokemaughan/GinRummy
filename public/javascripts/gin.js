var playerhand = [];
var enemyhand = [];
var discard = [];
var disEle = 0;
var deadwood;

/*gamestate:
0: waiting for draw choice
1: waiting for discard choice
2: Enemy's turn
3: Start of game
4: End of game
*/
var gamestate = -1;

//sort player hand, then display it
function sortbyvalue(arrayIn){
	arrayIn.sort(function compare(a,b){
		if (a[1] > b[1])
			return 1;
		if (a[1] < b[1])
			return -1;
		if (a[0] > b[0])
			return 1;
		if (a[0] < b[0])
			return -1;
		return 0;
	});
	return arrayIn;
}

function printhand(){
	
}

//sort array by suit first, then value in descneding order, then return array
function sortbysuit(arrayIn){
	arrayIn.sort(function compare(a,b){
		if (a[0] > b[0])
			return 1;
		if (a[0] < b[0])
			return -1;
		if (a[1] < b[1])
			return 1;
		if (a[1] > b[1])
			return -1;
		return 0;
	});
	return arrayIn;
}

function printPH(){
	$("#playerhand").empty();
	for(var i = 0; i < 10; i++) {
		newimg = '<img id="pcard_' + i + '"class="pcard" src="' + playerhand[i].images.png + '" style="width:150px;height:200px;" />';
		$("#playerhand").append(newimg);
	}

}

function clearAllHTML(){
	$("#enemyhand").empty();
	$("#playerhand").empty();
        $("#playerdraw").empty();
        $("#discards").empty();
        $("#deck").empty();
}

//hit new game button
//shuffle deck and deal
$(document).ready(function(){
	$('#ng').click(function(){
		//getting a new deck
		playerhand = []; enemyhand = []; discard = [];
		disEle = 0;
		clearAllHTML();
		var url = "/shuffle";
		$.ajax({
			url:url,
			dataType: 'json',
			type: 'GET',
		
			success: function(res) {
				console.log("remians " + res.remaining);
			}
		})
	
		//deals cards for person and enemy
		var url = "/dealCards";
		$.ajax({
			url:url,
			dataType:'json',
			type:'GET',
		
			success: function(res) {
				
				playerhand = res.cards; // setting the player's hand
				$("#enemyhand").append('<p> Enemy Hand </p>');
				$("#discards").append('<p> Discard Pile </p>');
				$("#deck").append('<p> Draw Pile </p> <img src = "images/cheetah-card.gif" style="width:150px;height:200px;" />');
						
				for (var i = 0; i < 10; i++){
					newimg = '<img src="images/cheetah-card.gif" style="width:150px;height:200px;" />';
					$("#enemyhand").append(newimg);
				}

				$("#playerdraw").append('<p> Your Hand </p>');
				printPH();
				gamestate = 0;
			}
		})
		
		var url = "/drawCard";
		$.ajax({
			url:url,
			dataType:'json',
			type:'GET',

			success: function(res){
				console.log("RES " + res.cards[0].suit);
				
				discard[disEle] = res.cards[0];
				disEle++;
				
				var url = "/discard";
				$.ajax({
					url:url,
					dataType:'json',
					type:'GET',
					data:{
						token: res.cards[0].code
					},
					
					success: function(res) {
						newimg = '<img src="' + discard[0].images.png + '" style = "width:150px;height:200px;" />';
                                       		$("#discards").append(newimg);
					}
			
				})
			}

		})



	});



	//draw from deck
	$('#deck').click(function(){
		if(gamestate ===0) {
			var url = "/drawCard";
			$.ajax({
				url:url,
				dataType:'json',
				type:'GET',

				success: function(res) {
					playerhand[10] = res.cards[0]; // should be adding that 11th card to the hand
					newimg = '<img src="' +playerhand[10].images.png + '" style="width:150px;height:200px;" />';
					$("#playerdraw").append(newimg);
					gamestate = 1;
				}
			})
		}
	});

	//draw from discard pile
	$('#discards').click(function(){
		if (gamestate === 0){
			var url = "/drawPile";
			$.ajax({
				url:url,
				dataType:'json',
				type:'GET',
				
				success: function(res) {
					playerhand[10] = res.cards[0];
					newimg = '<img src="' +playerhand[10].images.png + '" style="width:150px;height:200px;" />';
					$("#playerdraw").append(newimg);
					disEle--;
					$("#discards").empty();
					newimg = '<img src="' + discard[disEle].images.png + '" style = "width:150px;height:200px;" />'; 
					$("#discards").append(newimg);
					
					gamestate = 1;
				}
			})
		}
	})

	//discard your draw
	$('#playerdraw').click(function(){
		if (gamestate === 1){
			
			var url = "/discard";
			$.ajax({
				url:url,
				dataType:'json',
				type:'GET',
				data:{
					token: playerhand[10].code
				},
			
				success: function(res) {
					discard[disEle] = playerhand[10];
					disEle++;
					playerhand.pop();
					
					$("#discards").html($("#playerdraw").html());
					$("#playerdraw").empty();
					$("#playerdraw").append('<p> Your Hand </p>');
					gamestate = 0;
				}
			})
		}
	});
});

//debugging
function print(end){
	for(var i = 0; i < end ; i++){
		console.log(playerhand[i].code);
	}
}

//clicked a card in hand to discard
$(document).on("click", ".pcard", function(){
	if (gamestate === 1) {
		
		var disc = event.target.id.split("_"); // parses _, leaving "pcard,IDOFCARD"
		var card = playerhand[parseInt(disc[1])]; // gets the card at that ID
	
		var url = "/discard";
		$.ajax({
			url:url,
			dataType:'json',
			type:'GET',
			data:{
				token: card.code
			},

			success: function(res) {
				discard[disEle] = playerhand[10];
				disEle++;
				//gets rid of the discard from hand
				playerhand.splice(parseInt(disc[1]),1);
		
				var newimg = '<img src="' + card.images.png + '" style="width:150px;height:200px;" />';
		
				$("#discards").empty();
				$("#discards").append(newimg);
		
				$("#playerdraw").empty();
				$("#playerdraw").append('<p> Your Hand </p>');		
		
				printPH();

				gamestate = 0;
			}
		})
	}
});

//using recursion, check for a winning hand
//a is the array of remaining element, b is array of melds
//melds[] and deadwood are global variables
//try to find lowest deadwood possible.  If 10 or less, can declare a "win"
function checkforwin(a,b){
	var sets = a;
	var runs = a;

	//sets has the remaining array sorted by value, to check for 3/4 of a kind
	//runs has the remaining array sorted by suit, to check for straights
	sets = sortbyvalue(sets);
	runs = sortbysuit(runs);

	//check for a 3 of a kind in the sets array
	//if there is one, splice from array, add removed elements to b, and recurse
	//if there is 4 of a kind, recurse twice, once with removing 3 and once with 4
	//if none, tally up deadwood.  If lower than deadwood variable, replace it.
	//If that's lower than 10 as well, set melds to b
	//repeat process for runs.  Recurse 3 times for 4 straight
	//i.e (3,4,5,6) once with 345 removed, then 456, then 3456

	var i;
	for (i = 0; i < sets.length - 2; i++){
		if (i < (sets.length - 3) && sets[i][1] === sets[i+3][i]){
			//4 of a kind
			var sets_a = sets;
			var sets_b = sets;
			var b_a = b;
			var b_b = b;
			var newmeld = sets_a.splice(i,4);
			b_a.push(newmeld);
			checkforwin(sets_a,b_a);
			newmeld = sets_b.splice(i,3);
			b_b.push(newmeld);
			checkforwin(sets_b,b_b);
			return;
		} else if (sets[i][1] === sets[i+2][i]){
			//3 of a kind
			var sets_a = sets;
			var b_a = b;
			var newmeld = sets_a.splice(i,3);
			b_a.push(newmeld);
			checkforwin(sets_a,b_a);
			return;
		}
	}

	for (i = 0; i < runs.length - 2; i++){
		if (i < (runs.length - 3) && runs[i][1] === (runs[i+3][i] + 3) && runs[i][0] === runs[i+3][0]){
			//4 straight
			var runs_a = runs;
			var runs_b = runs;
			var runs_c = runs;
			var b_a = b;
			var b_b = b;
			var b_c = b;
			var newmeld = runs_a.splice(i,4);
			b_a.push(newmeld);
			checkforwin(runs_a,b_a);
			newmeld = runs_b.splice(i,3);
			b_b.push(newmeld);
			checkforwin(runs_b,b_b);
			newmeld = runs_c.splice(i+1,3);
			b_b.push(newmeld);
			checkforwin(runs_c,b_c);
			return;
		} else if (runs[i][1] === (runs[i+2][i] + 2) && runs[i][0] === runs[i+2][0]){
			//3 straight
			var runs_a = runs;
			var b_a = b;
			var newmeld = runs_a.splice(i,3);
			b_a.push(newmeld);
			checkforwin(runs_a,b_a);
			return;
		}
	}

	//no new melds found, tally up values
	var total = 0;
	for (i = 0; i < a.length; i++){
		total = total + a[i][1];
	}

	if (total < deadwood) {
		deadwood = total;
		if (deadwood <= 10){
			alert(deadwood, b);
			melds = b;
		}
	}
	return;
}
