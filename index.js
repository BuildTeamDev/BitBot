var Discordie = require('discordie');
var request = require('request');
var Events = Discordie.Events;
var webshot = require('webshot');
var fs      = require('fs');
var steem = require('steem');
var cryptoValues = require("./crypto.json");

var client = new Discordie();

client.connect({
	token: process.env.DISCORD_TOKEN
});

client.Dispatcher.on(Events.GATEWAY_READY, e => {
	console.log('Connected as: '+ client.User.username);
});

var options = { screenSize: { width: 300, height: 200 },
			  	renderDelay: 1000,
			  	quality: 100,
			  	defaultWhiteBackground: true,
			  	shotOffset: {left: 5, right: 5, top: 5, bottom: 5} 
			  };

client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
	var content = e.message.content;
	if(content.indexOf("$price ") === 0) {
		var coin = content.replace("$price ", "");
		var value = '';
		try{
			request('http://api.coinmarketcap.com/v1/ticker/' + coin + '/', function(error,res,body) {
		  		var obj = JSON.parse(body);
		  		console.log(obj[0]);
		  		if(obj[0] === undefined)
		  		{
		  			var a = true;
		  			for (var i = 0; i < cryptoValues.length; i++){
					  if (cryptoValues[i].symbol.toUpperCase() === coin.toUpperCase()){
					  	a = false;
					  	var coin1 = cryptoValues[i].id;
					    webshot('https://gopesh-sharma.github.io/coinMarketWidget/index.html?type=' + coin1, coin1 + '.jpeg', options, function(err) {
				  			if (err) 
				  				return console.log(err);
				  			console.log('OK');
				  			//e.message.channel.uploadFile(coin + ".jpeg", null, coin.toUpperCase);
						});
						e.message.channel.sendTyping();
						setTimeout(function() {
	    					var source = fs.createReadStream(coin1 + '.jpeg');                    	
							e.message.channel.uploadFile(source, coin1 + '.jpeg');
						}, 8000);
					  }
					}
					if(a === true){
						e.message.channel.sendMessage("You have entered a wrong id, have a great Day :)");
		  			}
		  		}
		  		else
		  		{
		  			value = coin.toUpperCase() + " : Current Price " + obj[0].price_usd + " | 24 Hour Percentage Change " + obj[0].percent_change_24h;
		  			//e.message.channel.sendMessage(value);
		  			webshot('https://gopesh-sharma.github.io/coinMarketWidget/index.html?type=' + coin, coin + '.jpeg', options, function(err) {
			  			if (err) 
			  				return console.log(err);
			  			console.log('OK');
			  			//e.message.channel.uploadFile(coin + ".jpeg", null, coin.toUpperCase);
					});
					e.message.channel.sendTyping();
					setTimeout(function() {
    					var source = fs.createReadStream(coin + '.jpeg');                    	
						e.message.channel.uploadFile(source, coin + '.jpeg');
					}, 8000);
		  		}
			});
		}
		catch (err) {
			e.message.channel.sendMessage("Wrong ID, Have a Great Day");
		}
		
	}

	if(content.indexOf("$new ") === 0) {
	}

	if(content.indexOf("$bts ") === 0) {
		try{
			var coin = content.replace("$bts ", "");
			request('https://cryptofresh.com/api/asset/markets?asset=' + coin.toUpperCase(), function(error,res,body) {
				var object = JSON.parse(body);
				if (error) 
	  				return console.log(error);
				if(object && object.USD){
					e.message.channel.sendMessage("Coin : " + coin + " | Price : " + object.USD.price + " USD");
				}
				else(object && object.BTS)
					e.message.channel.sendMessage("Coin : " + coin + " | Price : " + object.BTS.price + " BTS");
				
			});
		}
		catch (err) {
			e.message.channel.sendMessage("Wrong ID, Have a Great Day");
		}
	}

	if(content.toUpperCase().indexOf("BUILDTEAM") > -1 || content.toUpperCase().indexOf("BT") > -1 || content.indexOf("$buildteam") === 0 ||content.indexOf("$bt") === 0) {
		try{
			/*request('https://cryptofresh.com/api/asset/markets?asset=BUILDTEAM', function(error,res,body) {
				var object = JSON.parse(body);
				if (error) 
	  				return console.log(error);
				if(object && object.USD){
					e.message.channel.sendMessage("Coin : Buildteam | Price : " + object.USD.price + " USD");
				}
				else(object && object.BTS)
					e.message.channel.sendMessage("Coin : Buildteam | Price : " + object.BTS.price + " BTS");
				
			});*/
		}
		catch (err) {
			e.message.channel.sendMessage("Wrong ID, Have a Great Day");
		}
	}

	if(content.indexOf("$created ") === 0) {
		e.message.channel.sendTyping();
		var takeTag = content.replace("$created ", "");
		steem.api.getDiscussionsByCreated({tag:takeTag, limit:1}, function(err, result) {
			if (err) 
			  	return console.log(err);
			if(result[0])
				e.message.channel.sendMessage("https://steemit.com" + result[0].url);
			else
				e.message.channel.sendMessage("Sorry no such tag in Steemit");
		});
	}

	if(content.indexOf("$hot ") === 0) {
		e.message.channel.sendTyping();
		var takeTag = content.replace("$hot ", "");
		steem.api.getDiscussionsByHot({tag:takeTag, limit:1}, function(err, result) {
			if (err) 
			  	return console.log(err);
			if(result[0])
				e.message.channel.sendMessage("https://steemit.com" + result[0].url);
			else
				e.message.channel.sendMessage("Sorry no such tag in Steemit");
		});
	}

	if(content.indexOf("$trending ") === 0) {
		e.message.channel.sendTyping();
		var takeTag = content.replace("$trending ", "");
		steem.api.getDiscussionsByTrending({tag:takeTag, limit:1}, function(err, result) {
			if (err) 
			  	return console.log(err);
			if(result[0])
				e.message.channel.sendMessage("https://steemit.com" + result[0].url);
			else
				e.message.channel.sendMessage("Sorry no such tag in Steemit");
		});
	}

	if(content.indexOf("$accounts") === 0) {
		e.message.channel.sendTyping();
		steem.api.getAccountCount(function(err, response){
			if (err) 
			  	return console.log(err);
			e.message.channel.sendMessage("Total Steemit Accounts : " + response);
		});
	};
});