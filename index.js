const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

const PRICE_COMMAND = {
    check: function (event) {
        const content = event.message.content;
        return content.indexOf("$price ") === 0;
    },
    apply: function (event) {
        const content = event.message.content;
        let coin = content.replace("$price ", "");
        let value = '';
        request('http://api.coinmarketcap.com/v1/ticker/' + coin + '/', function (error, res, body) {
            const obj = JSON.parse(body);
            console.log(obj[0]);
            if (obj[0] === undefined) {
                let a = true;
                for (let i = 0; i < cryptoValues.length; i++) {
                    if (cryptoValues[i].symbol.toUpperCase() === coin.toUpperCase()) {
                        a = false;
                        const coin1 = cryptoValues[i].id;
                        webshot('https://gopesh-sharma.github.io/coinMarketWidget/index.html?type=' + coin1, coin1 + '.jpeg', options, function (err) {
                            if (err)
                                return console.log(err);
                            console.log('OK');
                            //e.message.channel.uploadFile(coin + ".jpeg", null, coin.toUpperCase);
                        });
                        event.message.channel.sendTyping();
                        setTimeout(function () {
                            const source = fs.createReadStream(coin1 + '.jpeg');
                            event.message.channel.uploadFile(source, coin1 + '.jpeg');
                        }, 8000);
                    }
                }
                if (a === true) {
                    e.message.channel.sendMessage("You have entered a wrong id, have a great Day :)");
                }
            }
            else {
                value = coin.toUpperCase() + " : Current Price " + obj[0].price_usd + " | 24 Hour Percentage Change " + obj[0].percent_change_24h;
                //e.message.channel.sendMessage(value);
                webshot('https://gopesh-sharma.github.io/coinMarketWidget/index.html?type=' + coin, coin + '.jpeg', options, function (err) {
                    if (err)
                        return console.log(err);
                    console.log('OK');
                    //e.message.channel.uploadFile(coin + ".jpeg", null, coin.toUpperCase);
                });
                event.message.channel.sendTyping();
                setTimeout(function () {
                    const source = fs.createReadStream(coin + '.jpeg');
                    event.message.channel.uploadFile(source, coin + '.jpeg');
                }, 8000);
            }
        });
    },
    name: '$price'
};

const COMMANDS = [PRICE_COMMAND];

function checkCommands(event) {
    COMMANDS.filter(function (command) {
        try {
            return command.check(event);
        } catch (err) {
            event.message.channel.sendMessage("Error applying filter for command " +
                command.name + " on event: ' " +
                JSON.stringify(event) + "' is: \n " +
                err.stack);
        }

    }).forEach(function (command) {
        try {
            command.apply(event);
        } catch (err) {
            event.message.channel.sendMessage("Error applying command " +
                command.name + " on event: ' " +
                JSON.stringify(event) + "' is: \n " +
                err.stack);
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

    const Discordie = require('discordie');
    const request = require('request');
    const Events = Discordie.Events;
    const webshot = require('webshot');
    const fs = require('fs');
    const steem = require('steem');
    const cryptoValues = require("./crypto.json");
    const client = new Discordie();

    client.connect({
        token: process.env.DISCORD_TOKEN
    });

    client.Dispatcher.on(Events.GATEWAY_READY, e => {
        console.log('Connected as: ' + client.User.username);
    });

    const options = {
        screenSize: {width: 300, height: 200},
        renderDelay: 1000,
        quality: 100,
        defaultWhiteBackground: true,
        shotOffset: {left: 5, right: 5, top: 5, bottom: 5}
    };

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