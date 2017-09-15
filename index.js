var Discordie = require('discordie');
var request = require('request');
var Events = Discordie.Events;

var client = new Discordie();

client.connect({
	token: 'MzU3NzQ2ODE3MTI5MjUwODIw.DJubsA.ZKgjsivjympjjiqWYL2qjOU4WtY'
})

client.Dispatcher.on(Events.GATEWAY_READY, e => {
	console.log('Connected as: '+ client.User.username);
});

client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
	var content = e.message.content;
	if(content.indexOf("$price ") == 0) {
		var coin = content.replace("$price ", "");
		var value = '';
		try{
			request('http://api.coinmarketcap.com/v1/ticker/' + coin + '/', function(error,res,body) {
		  		var obj = JSON.parse(body);
		  		console.log(obj[0]);
		  		if(obj[0] === undefined)
		  		{
		  			e.message.channel.sendMessage("You have entered a wrong id, have a great Day :)");
		  		}
		  		else
		  		{
		  			value = coin.toUpperCase() + " : Current Price " + obj[0].price_usd + " | 24 Hour Percentage Change " + obj[0].percent_change_24h;
		  			e.message.channel.sendMessage(value);
		  		}
			});
		}
		catch (err) {
			e.message.channel.sendMessage("Wrong ID, Have a Great Day");
		}
		
	}
});