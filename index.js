const cluster = require('cluster');
const http = require('http');
const https = require('https');
const numCPUs = require('os').cpus().length;
const request = require('request');
const Discordie = require('discordie');
const Events = Discordie.Events;
const webshot = require('webshot');
const fs = require('fs');
const steem = require('steem');
const cryptoValues = require("./crypto.json");
const client = new Discordie();
var cheerio = require('cheerio');

const options = {
    screenSize: {width: 300, height: 200},
    renderDelay: 1000,
    quality: 100,
    defaultWhiteBackground: true,
    shotOffset: {left: 5, right: 5, top: 5, bottom: 5}
};

function prettyPrintDiscordEvent(event) {
    if (event.message) {
        event = event.message;
    }
    if (event.content) {
        event = event.content;
    }
    JSON.stringify(event, null, 2)
}

function collectError(event, command, error) {
    event.message.channel.sendMessage("Error  for command `" +
        command.name + "` on event: \n```\n" +
        prettyPrintDiscordEvent(event.message) + "\n```\n is: \n```\n" +
        error.stack + "\n```");
}

function getCoinScreenshot(event, coin) {
    webshot('https://gopesh-sharma.github.io/coinMarketWidget/index.html?type=' + coin, coin + '.jpeg', options, function (err) {
        if (err) {
            return collectError(event, {name: 'webshot'}, err);
        }
        const source = fs.createReadStream(coin + '.jpeg');
        event.message.channel.uploadFile(source, coin + '.jpeg');
    });
}

function getFallbackCoinMarketCapScreenshot(event, coin) {
    for (let i = 0; i < cryptoValues.length; i++) {
        if (cryptoValues[i].symbol.toUpperCase() === coin.toUpperCase()) {
            return getCoinScreenshot(event, cryptoValues[i].id);
        }
    }
    event.message.channel.sendMessage(`The symbol ${coin} is not on coinmarketcap.com, sorry!`);
}

function getCoinMarketCapScreenshot(event, coin) {
    request('http://api.coinmarketcap.com/v1/ticker/' + coin + '/', function (error, res, body) {
        if (error) {
            return collectError(event, {name: 'coinmarketcap'}, error);
        }
        const response = JSON.parse(body);
        if (response[0] === undefined) {
            return getFallbackCoinMarketCapScreenshot(event, coin);
        }
        const value = coin.toUpperCase() + " : Current Price " + response[0].price_usd +
            " | 24 Hour Percentage Change " + response[0].percent_change_24h;
        event.message.channel.sendMessage(value);
        getCoinScreenshot(event, coin);
    });
}

function getBTSCryptoFresh(event, coin) {
    request('https://cryptofresh.com/api/asset/markets?asset=' + coin.toUpperCase(), function (error, res, body) {
        try{
            const object = JSON.parse(body);
            if(coin.toUpperCase() === 'BUILDTEAM') {
                coin = 'Build Team';
            }
            if (error)
                return collectError(event, {name: 'cryptofresh'}, error);
            if (object && object.USD) {
                event.message.channel.sendMessage("```javascript\nCoin : " + coin + " | Price : " + object.USD.price + " USD ```\n");
            }
            else if(object && object.BTS) {
                event.message.channel.sendMessage("```javascript\nCoin : " + coin + " | Price : " + object.BTS.price + " Bitshares ```\n");
            }
        }
        catch(error) {
            event.message.channel.sendMessage(`The coin ${coin} is not available, sorry!`);
        }
    });
}

const PRICE_COMMAND = {
    check: function (event) {
        const content = event.message.content;
        return content.indexOf("$price ") === 0;
    },
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$price ", "").replace(",", " ").replace(";", " ").split(' ');
        event.message.channel.sendTyping();
        for (let i = 0; i < coins.length; i++) {
            if(coins[i].length > 1) {
                getCoinMarketCapScreenshot(event, coins[i]);
            }
        }
    },
    name: '$price'
};

const BTS_COMMAND = {
    check: function (event) {
        const content = event.message.content;
        return content.indexOf("$bts ") === 0;
    },
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$bts ", "").replace(",", " ").replace(";", " ").split(' ');
        event.message.channel.sendTyping();
        for (let i = 0; i < coins.length; i++) {
            if(coins[i].length > 1) {
                getBTSCryptoFresh(event, coins[i]);
            }
        }
    },
    name: '$bts'
};

const COMMANDS = [PRICE_COMMAND, BTS_COMMAND];

function checkCommands(event) {
    COMMANDS.filter(function (command) {
        try {
            return command.check(event);
        } catch (err) {
            collectError(event, command, err);
        }

    }).forEach(function (command) {
        try {
            command.apply(event);
        } catch (err) {
            collectError(event, command, err);
        }
    });
}

if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);
    // Fork workers.
    for (let i = 0; i < 1; i++) {
        cluster.fork();
    }
    cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} died`);
    });
} else {
    console.log(`Worker ${process.pid} started`);
    
    client.connect({
        token: process.env.DISCORD_TOKEN
    });

    client.Dispatcher.on(Events.GATEWAY_READY, e => {
        console.log('Connected as: ' + client.User.username);
    });

    client.Dispatcher.on(Events.MESSAGE_CREATE, e => {
        checkCommands(e);
        let coin;
        const content = e.message.content;

        var toUpperCaseContent = content.toUpperCase();
		var ex = /.*(BUILDTEAM).*/
		if(ex.test(toUpperCaseContent) && content.indexOf("$bts ") !== 0) {
			try{
				request('https://cryptofresh.com/api/asset/markets?asset=BUILDTEAM', function(error,res,body) {
					try{
                        var object = JSON.parse(body);
    					if (error) 
    	  					return collectError(event, {name: 'cryptofresh'}, error);
    					if(object && object.USD){
    						e.message.reply("```javascript\nCoin : Build Team | Price : " + object.USD.price + " USD ```\n");
    					}
    					else if(object && object.BTS){
    						e.message.reply("```javascript\nCoin : Build Team | Price : " + object.BTS.price + " Bitshares ```\n");
    					}
                    }
                    catch(error) {
                        event.message.channel.sendMessage("The coin Build Team is not available, sorry!");
                    }
				});
			}
			catch (err) {
				e.message.channel.sendMessage("Wrong ID, Have a Great Day");
			}
		}

        if (content.indexOf("$created ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$created ", "");
            steem.api.getDiscussionsByCreated({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return collectError(event, {name: 'created'}, err);
                forTags(e, result[0]);
            });
        }

        if (content.indexOf("$hot ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$hot ", "");
            steem.api.getDiscussionsByHot({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return collectError(event, {name: 'hot'}, err);
                forTags(e, result[0]);
            });
        }

        if (content.indexOf("$trending ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$trending ", "");
            steem.api.getDiscussionsByTrending({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return collectError(event, {name: 'trending'}, err);
                forTags(e, result[0]);
            });
        }

        if (content.indexOf("$accounts") === 0) {
            e.message.channel.sendTyping();
            steem.api.getAccountCount(function (err, response) {
                if (err)
                    return collectError(event, {name: 'accounts'}, err);
                e.message.channel.sendMessage("Total Steemit Accounts : " + response);
            });
        }

        if (content.indexOf("$top") === 0) {
            e.message.channel.sendTyping();
            var limit = content.replace("$top", "");
            if(limit > 20)
            	limit = 20;
            request('https://api.coinmarketcap.com/v1/ticker/?limit=' + limit, function (error, res, body) {
		        if (error) {
		            return collectError(event, {name: 'coinmarketcap'}, error);
		        }
                try{
                    const response = JSON.parse(body);
                    var topValue = "";
                    for(let s of response) {
                        topValue += s.rank + ". " + s.name + ", " + s.price_usd + " USD \n";    
                    }
                    e.message.channel.sendMessage("```javascript\n" + topValue + "```\n");
                }
                catch(error) {
                    event.message.channel.sendMessage("Error fetching the top results,please try again later!");
                }
		    });
        }

        if (content.indexOf("$rank") === 0) {
            e.message.channel.sendTyping();
            var rank = content.replace("$rank ", "");
            request('https://api.coinmarketcap.com/v1/ticker/?limit=' + rank, function (error, res, body) {
		        if (error) {
		            return collectError(event, {name: 'coinmarketcap'}, error);
		        }
                try{
                    const response = JSON.parse(body);
                    if(response[rank-1]) {
                        var s = response[rank-1];
                        e.message.channel.sendMessage("```javascript\nName : " + s.name + " | Price : " + s.price_usd + " USD \n```");
                    }
                }
                catch(error) {
                    event.message.channel.sendMessage("Error fetching the rank results,please try again later!");
                }
		    });
        }

        if (content.indexOf("$new") === 0) {
            e.message.channel.sendTyping();
            var limit = parseInt(content.replace("$new", ""));
            getNewCoins(e, limit);
        }
    });
}

function getNewCoins(e, limit) {
	url = 'https://coinmarketcap.com/new/';
	var request = https.get(url, function(response) {
		var reply = '';
		var counter = 0;
		var json = '';
		response.on('data', function(chunk) {
			json += chunk;
		});

		response.on('end', function() {
			var $ = cheerio.load(json);
			$('.table tbody').children().each(function() {
				if(counter++ === limit)
					return false;
				var coinName = $(this).children('.currency-name').children('a').text();
				var price = $(this).children('.text-right').children('a.price').text();
				reply += coinName + ", " + price + " USD \n";
			});
			e.message.channel.sendMessage("```javascript\n" + reply + " \n```");
		});
	});
	request.on('error', function(err) {
		return collectError(event, {name: 'coinmarketcap webscraping'}, error);
	});
}

function forTags(event, result){
	if (result) {
    	var value = "Pending Payout : " + result.pending_payout_value;
    	value += "\nTotal Votes : " + result.net_votes;
    	value += "\nhttps://steemit.com" + result.url;
    	event.message.channel.sendMessage(value);
    }  
    else
        event.message.channel.sendMessage("Sorry no such tag in Steemit");
}