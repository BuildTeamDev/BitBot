const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const request = require('request');
const Discordie = require('discordie');
const Events = Discordie.Events;
const webshot = require('webshot');
const fs = require('fs');
const steem = require('steem');
const cryptoValues = require("./crypto.json");
const client = new Discordie();

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
    event.message.channel.sendTyping();
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

const PRICE_COMMAND = {
    check: function (event) {
        const content = event.message.content;
        return content.indexOf("$price ") === 0;
    },
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$price ", "").split(' ');
        for (let i = 0; i < coins.length; i++) {
            getCoinMarketCapScreenshot(event, coins[i]);
        }
    },
    name: '$price'
};

const COMMANDS = [PRICE_COMMAND];

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
        if (content.indexOf("$new ") === 0) {
        }

        if (content.indexOf("$bts ") === 0) {
            try {
                coin = content.replace("$bts ", "");
                request('https://cryptofresh.com/api/asset/markets?asset=' + coin.toUpperCase(), function (error, res, body) {
                    const object = JSON.parse(body);
                    if (error)
                        return console.log(error);
                    if (object && object.USD) {
                        e.message.channel.sendMessage("Coin : " + coin + " | Price : " + object.USD.price + " USD");
                    }
                    else(object && object.BTS)
                    {
                        e.message.channel.sendMessage("Coin : " + coin + " | Price : " + object.BTS.price + " BTS");
                    }
                });
            }
            catch (err) {
                e.message.channel.sendMessage("Wrong ID, Have a Great Day");
            }
        }

        if (content.toUpperCase().indexOf("BUILDTEAM") > -1 || content.toUpperCase().indexOf("BT") > -1 || content.indexOf("$buildteam") === 0 || content.indexOf("$bt") === 0) {
            try {
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

        if (content.indexOf("$created ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$created ", "");
            steem.api.getDiscussionsByCreated({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return console.log(err);
                if (result[0])
                    e.message.channel.sendMessage("https://steemit.com" + result[0].url);
                else
                    e.message.channel.sendMessage("Sorry no such tag in Steemit");
            });
        }

        if (content.indexOf("$hot ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$hot ", "");
            steem.api.getDiscussionsByHot({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return console.log(err);
                if (result[0])
                    e.message.channel.sendMessage("https://steemit.com" + result[0].url);
                else
                    e.message.channel.sendMessage("Sorry no such tag in Steemit");
            });
        }

        if (content.indexOf("$trending ") === 0) {
            e.message.channel.sendTyping();
            var takeTag = content.replace("$trending ", "");
            steem.api.getDiscussionsByTrending({tag: takeTag, limit: 1}, function (err, result) {
                if (err)
                    return console.log(err);
                if (result[0])
                    e.message.channel.sendMessage("https://steemit.com" + result[0].url);
                else
                    e.message.channel.sendMessage("Sorry no such tag in Steemit");
            });
        }

        if (content.indexOf("$accounts") === 0) {
            e.message.channel.sendTyping();
            steem.api.getAccountCount(function (err, response) {
                if (err)
                    return console.log(err);
                e.message.channel.sendMessage("Total Steemit Accounts : " + response);
            });
        }

    });
}