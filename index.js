const cluster = require('cluster');
const http = require('http');
const https = require('https');
const request = require('request');
const Discordie = require('discordie');
const Events = Discordie.Events;
const webshot = require('webshot');
const fs = require('fs');
const steem = require('steem');
const cryptoValues = require("./crypto.json");
const client = new Discordie();
const cheerio = require('cheerio');

const options = {
    screenSize: {width: 300, height: 200},
    renderDelay: 2000,
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
        try {
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
        }
        catch (error) {
            event.message.channel.sendMessage(`The coin ${coin} is not available, sorry!`);
        }
    });
}

function getBTSCryptoFresh(event, coin) {
    request('https://cryptofresh.com/api/asset/markets?asset=' + coin.toUpperCase(), function (error, res, body) {
        try {
            if (error) {
                return collectError(event, {name: 'cryptofresh'}, error);
            }
            const object = JSON.parse(body);
            if (object && object.USD) {
                event.message.channel.sendMessage("```javascript\nCoin : " + coin + " | Price : " + object.USD.price + " USD ```\n");
            }
            if (object && object.BTS) {
                event.message.channel.sendMessage("```javascript\nCoin : " + coin + " | Price : " + object.BTS.price + " Bitshares ```\n");
            }
        }
        catch (error) {
            event.message.channel.sendMessage(`The coin ${coin} is not available, sorry!`);
        }
    });
}

function getFallbackCoinMarketCapConvert(event, coins) {
    try {
        for (let i = 0; i < cryptoValues.length; i++) {
            if (cryptoValues[i].symbol.toUpperCase() === coins[1].toUpperCase()) {
                coins[1] = cryptoValues[i].id;
                return convertCoins(event, coins);
            }
            if (cryptoValues[i].id.toUpperCase() === coins[2].toUpperCase()) {
                coins[2] = cryptoValues[i].symbol.toLowerCase();
                return convertCoins(event, coins);
            }
        }
        event.message.channel.sendMessage("These coins conversion not supported");
    }
    catch (error) {
        event.message.channel.sendMessage("These coins conversion not supported");
    }
}

function convertCoins(event, coins) {
    request('http://api.coinmarketcap.com/v1/ticker/' + coins[1] + '/?convert=' + coins[2], function (error, res, body) {
        try {
            if (error) {
                return collectError(event, {name: 'coinmarketcap convert error'}, error);
            }
            const response = JSON.parse(body);
            if (response[0] === undefined) {
                return getFallbackCoinMarketCapConvert(event, coins);
            }
            const totalValue = Number(response[0]["price_" + coins[2]]) * Number(coins[0]);
            if (response[0]["price_" + coins[2]]) {
                const value = coins[0] + " " + coins[1] + " is equal to " + totalValue + " " + coins[2];
                event.message.channel.sendMessage("```javascript\n" + value + "\n```");
            }
            else
                return getFallbackCoinMarketCapConvert(event, coins);

        }
        catch (error) {
            event.message.channel.sendMessage("These coins conversion not supported");
        }
    });
}

function printList(event) {
    return function (err, result) {
        if (err) {
            return collectError(event, {name: 'printList'}, err);
        }
        if (result.length <= 0) {
            return event.message.channel.sendMessage("Sorry, there were no posts available.");
        }
        for (let i = 0; i < result.length; i++) {
            printTag(event, result[i]);
        }
    };
}

function printTag(event, result) {
    let value = "Pending Payout : " + result.pending_payout_value;
    value += "\nTotal Votes : " + result.net_votes;
    value += "\nPosted Time : " + new Date(result.created).toUTCString();
    value += "\nhttps://steemit.com" + result.url;
    event.message.channel.sendMessage(value);
}


function getNewCoins(event, limit) {
    let url = 'https://coinmarketcap.com/new/';
    const request = https.get(url, function (response) {
        let reply = '';
        let counter = 0;
        let json = '';
        response.on('data', function (chunk) {
            json += chunk;
        });

        response.on('end', function () {
            const $ = cheerio.load(json);
            $('.table tbody').children().each(function () {
                if (counter++ === limit)
                    return false;
                const coinName = $(this).children('.currency-name').children('a').text();
                const price = $(this).children('.text-right').children('a.price').text();
                reply += coinName + ", " + price + " USD \n";
            });
            event.message.channel.sendMessage("```javascript\n" + reply + " \n```");
        });
    });
    request.on('error', function (err) {
        return collectError(event, {name: 'coinmarketcap webscraping'}, err);
    });
}

function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function beginsWith(name) {
    return function (event) {
        const content = event.message.content;
        return content.indexOf(name) === 0;
    }
}

function getCoinTicker(event, limit, onlyOne) {
    request('https://api.coinmarketcap.com/v1/ticker/?limit=' + limit, function (error, res, body) {
        if (error) {
            return collectError(event, {name: 'coinmarketcap'}, error);
        }
        try {
            const response = JSON.parse(body);
            let topValue = "";

            for (let s of response) {
                if (onlyOne) {
                    if (response[limit - 1]) {
                        topValue += "Name : " + s.name + " | Price : " + s.price_usd + " USD";
                    }
                } else {
                    topValue += s.rank + ". " + s.name + ", " + s.price_usd + " USD \n";
                }
            }
            event.message.channel.sendMessage("```javascript\n" + topValue + "```\n");
        }
        catch (error) {
            return collectError(event, {name: 'coinmarketcap'}, error);
        }
    });
}

const PRICE_COMMAND = {
    check: beginsWith('$price'),
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$price ", "").replace(",", " ").replace(";", " ").split(' ');
        event.message.channel.sendTyping();
        for (let i = 0; i < coins.length; i++) {
            if (coins[i].length > 1) {
                getCoinMarketCapScreenshot(event, coins[i]);
            }
        }
    },
    help: "`$price [coin]`\nf.e.: `$price steem`",
    name: '$price'
};

const BTS_COMMAND = {
    check: beginsWith('$bts'),
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$bts ", "").replace(",", " ").replace(";", " ").split(' ');
        event.message.channel.sendTyping();
        for (let i = 0; i < coins.length; i++) {
            if (coins[i].length > 1) {
                getBTSCryptoFresh(event, coins[i]);
            }
        }
    },
    help: "`$bts [token]`\nf.e.: `$bts buildteam`",
    name: '$bts'
};

const CONVERT_COMMAND = {
    check: beginsWith("$convert"),
    apply: function (event) {
        const content = event.message.content;
        let coins = content.replace("$convert ", "").split(' ');
        event.message.channel.sendTyping();
        if (coins.length >= 1 && !isNumeric(coins[0])) {
            event.message.reply('Please enter a number to convert');
        }
        else if (coins.length === 3) {
            convertCoins(event, coins);
        }
        else {
            event.message.reply('Please enter correct value to convert');
        }

    },
    help: "`$convert [amount] [from-coin] [to-coin]`\nf.e.: `$convert 3 steem bts`",
    name: '$convert'
};

const buildteamRegEx = /.*(\bBUILDTEAM\b|\bBT\b).*/;
const BUILDTEAM_COMMAND = {
    check: function (event) {
        const content = event.message.content.toUpperCase();
        return buildteamRegEx.test(content);
    },
    apply: function (event) {
        getBTSCryptoFresh(event, 'buildteam');
    },
    help: "Talk about buildteam and the bot will give some up to date infos on it :)",
    name: '$buildteam'
};


const CREATED_COMMAND = {
    check: beginsWith("$created"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        const params = content.replace("$created ", "").split(' ');
        const tag = params[0];
        const limit = params.length > 1 ? parseInt(params[1]) : 1;
        steem.api.getDiscussionsByCreated({tag: tag, limit: limit}, printList(event));
    },
    help: "`$created [tag] (limit=1)`\nf.e.: `$created steem` or `$created life 5`",
    name: '$created'
};

const HOT_COMMAND = {
    check: beginsWith("$hot"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        const params = content.replace("$hot ", "").split(' ');
        const tag = params[0];
        const limit = params.length > 1 ? parseInt(params[1]) : 1;
        steem.api.getDiscussionsByHot({tag: tag, limit: limit}, printList(event));
    },
    help: "`$hot [tag] (limit=1)`\nf.e.: `$hot steem` or `$hot life 5`",
    name: '$hot'
};

const TRENDING_COMMAND = {
    check: beginsWith("$trending"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        const params = content.replace("$trending ", "").split(' ');
        const tag = params[0];
        const limit = params.length > 1 ? parseInt(params[1]) : 1;
        steem.api.getDiscussionsByTrending({tag: tag, limit: limit}, printList(event));
    },
    help: "`$trending [tag] (limit=1)`\nf.e.: `$trending steem` or `$trending life 5`",
    name: '$trending'
};

const ACCOUNTS_COMMAND = {
    check: beginsWith("$accounts"),
    apply: function (event) {
        event.message.channel.sendTyping();
        steem.api.getAccountCount(function (err, response) {
            if (err) {
                return collectError(e, {name: '$accounts'}, err);
            }
            event.message.channel.sendMessage("Total Steemit Accounts : " + response);
        });
    },
    help: false,
    name: '$accounts'
};

const TOP_COMMAND = {
    check: beginsWith("$top"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        let limit = parseInt(content.replace("$top", ""));
        if (limit < 1 || limit > 200) {
            limit = 20;
        }
        getCoinTicker(event, limit, false);
    },
    help: "`$top (limit=20)`\nf.e.: `$top 5``",
    name: '$top'
};

const RANK_COMMAND = {
    check: beginsWith("$rank"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        let rank = parseInt(content.replace("$rank", ""));
        if (rank < 1 || rank > 1000) {
            rank = 1;
        }
        getCoinTicker(event, rank, true);
    },
    help: "`$rank (rank=1)`\nf.e.: `$rank 5``",
    name: '$rank'
};

const NEW_COMMAND = {
    check: beginsWith("$new"),
    apply: function (event) {
        const content = event.message.content;
        event.message.channel.sendTyping();
        let limit = parseInt(content.replace("$new", ""));
        if (limit < 1 || limit > 200) {
            limit = 20;
        }
        getNewCoins(event, limit);
    },
    help: "`$new (limit=1)`\nf.e.: `$new 5``",
    name: '$new'
};

const HELP_COMMAND = {
    check: function (event) {
        return false;
    },
    apply: function (event) {
    },
    help: "Commands available: `$price|$bts|$convert|$buildteam|$created|$hot|$trending|$accounts|$top|$rank|$new`" +
    "\nTry typing a command to get detailed help for it.",
    name: '$help'
};


const COMMANDS = [PRICE_COMMAND, BTS_COMMAND, CONVERT_COMMAND, BUILDTEAM_COMMAND, HELP_COMMAND,
    CREATED_COMMAND, HOT_COMMAND, TRENDING_COMMAND, ACCOUNTS_COMMAND, TOP_COMMAND, RANK_COMMAND, NEW_COMMAND];

function checkCommands(event) {
    COMMANDS.filter(function (command) {
        try {
            const content = event.message.content;
            if (command.help && content === command.name) {
                event.message.channel.sendMessage(command.help);
                return false;
            }
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
        cluster.fork();
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
        if (e.message.author.bot) {
            return;
        }
        checkCommands(e);
    });
}
