require('dotenv').load();

console.log(process.env);

var x = require('x-ray')(),
    async = require('async'),
    _ = require('underscore'),
    mongoose = require('mongoose'),
    util = require('util'),
    huntsman = require('huntsman'),
    spider = huntsman.spider(),
    request = require('request').defaults({encoding: null}),
    fs = require('fs'),
    imaging = require(__dirname + '/imaging.js').imaging,
    aeScraper = require(__dirname + '/aliexpress.js').aescraper,
    amznScraper = require(__dirname + '/amazon.js').amznscraper;

require(__dirname + '/../model');

var connectionString = 'mongodb://' + process.env.DB_USER + ':' + process.env.DB_PWD + '@' +
    process.env.DB_HOST + ':' + process.env.DB_PORT + '/' + process.env.DB_NAME;
mongoose.connect(connectionString);

var Product = mongoose.models.Product;
var Match = mongoose.models.Match;
var Criteria = mongoose.models.Criteria;


spider.extensions = [
    huntsman.extension( 'recurse' ), // load recurse extension & follow anchor links
    huntsman.extension( 'cheerio' ) // load cheerio extension
];

// run AE scraper

aeScraper.run();
aeScraper.fetch();

var runAmzn = function(){
    amznScraper.run(function(){
        runAmzn();
    });
};
runAmzn();

/*var runImaging = function(){
    imaging.run(function(){
        runImaging();
    });
};
runImaging();*/

return;

var dst, src;

//compare pillows
async.series([

    function(cb){

        Product.findOne({'externalId': '1000201992'}).exec(function(err, entity){

            dst = entity;
            cb(err);

        });

    },

    function(cb){

        Product.findOne({'externalId': 'B00EINBSJ2'}).exec(function(err, entity){

            src = entity;
            cb(err);

        });

    },

    function(cb){

        Match.generateMatch(src, dst, function(err, certainty){

            if(err) return cb(err);

        });

    }

], function(err){

    console.log(err);

});