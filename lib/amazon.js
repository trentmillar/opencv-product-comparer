require('dotenv').load();

var x = require('x-ray')(),
    async = require('async'),
    _ = require('underscore'),
    util = require('util'),
    OperationHelper = require('apac').OperationHelper,
    opHelper = new OperationHelper({
        awsId:     process.env.AWS_KEY,
        awsSecret: process.env.AWS_SECRET,
        assocId:   process.env.AWS_ASSOCIATE,
        version:   '2013-08-01'
    }),
    mongoose = require('mongoose'),
    request = require('request').defaults({encoding: null}),
    fs = require('fs');


var generateGuid = function(){

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

var fetchImages = function(obj, cb) {

    var entity = obj;
    async.series([

        function(callback){

            async.each(entity.imageFiles, function (file, cbRemove) {

                fs.unlink(file, cbRemove);

            }, function (err) {

                return callback(err);

            });

        },

        function(callback){

            //clear array
            entity.imageFiles = [];

            async.each(entity.images, function (image, cbAdd) {

                var file = process.env.FILE_DROP + 'files/' + generateGuid() + '.jpg';
                var writeStream = fs.createWriteStream(file);
                writeStream.on('close', function () {

                    entity.imageFiles.push(file);
                    return cbAdd();

                });

                writeStream.on('error', function () {
                    console.log('failed');
                    return cbAdd('failed');
                });

                request(image).pipe(writeStream);


            }, function (err) {

                return callback(err);

            });
        }

    ], function(err){

        cb(err, entity);

    });
};

AmazonScraper = function() {

    return {

        run: function (finished) {

            require(__dirname + '/../model');
            var Product = mongoose.models.Product;
            var Criteria = mongoose.models.Criteria;
            var criterion = [];

            async.series([

                function (cb) {

                    //if nothing then fake one - remove this
                    Criteria.findOne().exec(function (err, doc) {

                        if (err) return cb(err);
                        if (doc) return cb();

                        var criteria = new Criteria();
                        criteria.operation = "ItemSearch";
                        criteria.searchIndex = "HomeGarden";
                        criteria.keywords = "pillow bamboo";
                        criteria.responseGroup = "ItemAttributes,BrowseNodes,Offers,VariationOffers,Images";
                        criteria.condition = "New";
                        criteria.minPrice = "100";
                        criteria.maxPrice = "5000";
                        criteria.date = new Date();
                        criteria.disabled = false;
                        criteria.save(cb);

                    });

                },

                function (cb) {

                    Criteria.find({'disabled': false}).sort("-lastRunDate").exec(function (err, docs) {

                        criterion = docs;
                        return cb(err);

                    });

                },

                function (cb) {

                    async.eachLimit(criterion, 1,

                        function (criteria, cbMain) {

                            //const
                            var step = 10;

                            var req = criteria.amazonCriteria;
                            req.MinimumPrice = criteria.minPrice;
                            var maximumPrice = criteria.maxPrice;
                            var delta = step;

                            req.MaximumPrice = req.MinimumPrice;
                            req.VariationPage = 1;
                            req.IncludeReviewsSummary = true;

                            var go = true;
                            var elapsed = new Date().getTime();

                            async.doWhilst(
                                function (callback) {

                                    async.series([

                                        function (cb2) {

                                            var countdown = function () {
                                                setTimeout(function () {

                                                    if ((elapsed + 1000) < new Date().getTime()) {

                                                        return cb2();

                                                    }
                                                    countdown();

                                                }, 1);
                                            };
                                            countdown();

                                        },

                                        function (cb2) {

                                            if(req.VariationPage === 1) {
                                                req.MinimumPrice = req.MaximumPrice + 1;
                                                req.MaximumPrice += delta;
                                            }

console.log('Running ' + req.MinimumPrice + ' - ' + req.MaximumPrice );

                                            if(req.MaximumPrice >= maximumPrice) go = false;

                                            opHelper.execute(criteria.operation, JSON.parse(JSON.stringify(req)),
                                                function (error, results) {

                                                    elapsed = new Date().getTime();

                                                    if (error) return cb2(error);

                                                    var _resp = (results.ItemSearchResponse && results.ItemSearchResponse.Items)
                                                        ? results.ItemSearchResponse.Items[0]
                                                        : null;

                                                    if (!_resp) {

                                                        if (results.ItemSearchResponse &&
                                                            results.ItemSearchResponse.Error && results.ItemSearchResponse.Items.Error.length > 0) {

                                                            return callback(results.ItemSearchResponse.Error[0].Message);
                                                        }

                                                        return cb2('fd up');
                                                    }

                                                    var _req = _resp.Request[0];

                                                    if (_req.IsValid && _req.IsValid[0] == "False") {

                                                        var msg = '';
                                                        _.each(_.pluck(_req.Errors, 'Error'), function (error) {

                                                            if (error && error.length > 0)
                                                                msg += '\n' + error[0].Message;

                                                        });
                                                        return cb2(msg);

                                                    }

                                                    var result = results.ItemSearchResponse && results.ItemSearchResponse.Items
                                                    && results.ItemSearchResponse.Items.length > 0
                                                        ? results.ItemSearchResponse.Items[0]
                                                        : null;

                                                    if (!result) {
                                                        //nothiing???
                                                        return cb2('shitz fan');
                                                    }

                                                    //check for 0 results
                                                    var total = Number(result.TotalResults[0]);

                                                    if (total === 0) {
                                                        delta = 5 * step;
                                                        return cb2();
                                                    }
                                                    else if (total < 10) {
                                                        delta = step;
                                                    }
                                                    else if (total > 10) {

                                                        var pages = Math.ceil(total / 10);

                                                        if (pages > 10) {
                                                            if(delta > 1) {
                                                                req.MaximumPrice = req.MinimumPrice - 1;
                                                                req.VariationPage = 1;
                                                                delta = 1;//Math.ceil(step / 5);
                                                                return cb2();
                                                            }
                                                        } else {
                                                            req.VariationPage = req.VariationPage < pages ? (req.VariationPage + 1) : 1;
                                                        }
                                                    }

                                                    if (result.Item.length == 0) return callback();

                                                    async.each(result.Item, function (item, callback2) {

                                                        //build out product
                                                        var entity;
                                                        var ignore = false;

                                                        async.series([

                                                            function(cbBuild){

                                                                Product.buildAmazonApiProduct(item, function (err, doc) {

                                                                    entity = doc;
                                                                    return cbBuild(err);

                                                                });
                                                            },

                                                            function(cbBuild){

                                                                Product.findOne({"externalId": entity.externalId}, function (err, doc) {

                                                                    if (doc) {

                                                                        entity = doc;

                                                                        if (doc.hash !== entity.hash) {

                                                                            entity.previousProduct = doc;

                                                                            fetchImages(entity, function(err, result){

                                                                                result.save(function (err, saved) {

                                                                                    entity = saved;
                                                                                    Product.remove({_id: doc._id}, cbBuild);

                                                                                });
                                                                            });

                                                                        } else {
                                                                            ignore = true;
                                                                            return cbBuild();
                                                                        }
                                                                    } else {

                                                                        fetchImages(entity, function(err, result){

                                                                            result.save(function(err, saved){

                                                                                entity = saved;
                                                                                if(err) console.log('Err ' + err);
                                                                                return cbBuild(err);
                                                                            });

                                                                        });
                                                                    }
                                                                });

                                                            },

                                                            function(cbBuild) {

                                                                if (ignore) return cbBuild();
                                                                if (!entity.offerUrl) return cbBuild();

                                                                var url = entity.offerUrl;

                                                                var huntsman = require('huntsman');
                                                                var spider = huntsman.spider();

                                                                spider.extensions = [
                                                                    huntsman.extension( 'cheerio' ) // load cheerio extension
                                                                ];

                                                                spider.on(url, function ( err, res ){

                                                                    if (!res.extension.cheerio) return; // content is not html
                                                                    var $ = res.extension.cheerio;

                                                                    entity.sellers=[];

                                                                    $('.olpOffer').each(function(){

                                                                        var offer = $(this);
                                                                        if (!/new/gmi.test($('.olpOffer').find('.olpCondition').text())) {
                                                                            return;
                                                                        }
                                                                        var shipping = offer.find('p.olpShippingInfo span').text().trim();
                                                                        var isExpedited = /Expedited shipping available/gmi.test(location);
                                                                        var availability = offer.find('.olpAvailability').text().trim();
                                                                        var price = offer.find('span.olpOfferPrice').text().trim().replace('$', '');
                                                                        var location = 'UNKNOWN';
                                                                        var sellerRating = 'NEW';

                                                                        if (/\d+\%/gmi.test(offer.find('.olpSellerColumn b').text())) {

                                                                            sellerRating = offer.find('.olpSellerColumn b')
                                                                                .text().match(/\d+\%/gmi)[0].replace('%', '');
                                                                        }

                                                                        var sellerLink = offer.find('.olpSellerColumn p.olpSellerName a').attr('href');

                                                                        if(!/http:\/\/www.amazon/gmi.test(sellerLink)){

                                                                            sellerLink = 'http://www.amazon.com' + sellerLink;
                                                                        }

                                                                        var _location = offer.find('.olpDeliveryColumn ul li span').text();

                                                                        if (/ships from\D+?\./gmi.test(_location)) {
                                                                            location = _location.match(/ships from\D+?\./gmi)[0]
                                                                                .replace(/ships from /gmi, '').replace('.', '');

                                                                            if (/,/gmi.test(location)) {

                                                                                var split = location.split(',');
                                                                                location = split[split.length - 1].trim();

                                                                            }
                                                                        }

                                                                        if (/\$[0-9]+\.[0-9]+/gmi.test(shipping)) {
                                                                            shipping = shipping.match(/\$[0-9]+\.[0-9]+/gmi)[0].replace('$','');
                                                                        } else if (/free/gmi.test(shipping)) {
                                                                            shipping = 0;
                                                                        } else {
                                                                            shipping = null;
                                                                        }

                                                                        entity.sellers.push({
                                                                            availability: availability,
                                                                            isExpedited: isExpedited,
                                                                            price: price,
                                                                            location: location,
                                                                            sellerStoreUrl: sellerLink,
                                                                            sellerRating: sellerRating,
                                                                            shippingPrice: shipping
                                                                        });
                                                                    });

                                                                    return cbBuild();

                                                                });

                                                                spider.queue.add(url);
                                                                spider.start();

                                                            },

                                                            function(cbBuild){

                                                                entity.save(cbBuild);
                                                            }


                                                        ], function(err){

                                                            callback2(err);
                                                        });


                                                    }, function (err) {

                                                        return cb2(err);

                                                    });

                                                });

                                        }
                                    ], function (err) {

                                        return callback(err);

                                    });

                                },

                                function () {

                                    return go;

                                },

                                function (err) {

                                    cbMain(err);

                                });

                        }, function (err) {

                            return cb(err);

                        });
                }

            ], function (err) {

                return finished(err);

            });

        }
    }
}

module.exports.amznscraper = new AmazonScraper();