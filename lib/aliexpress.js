require('dotenv').load();

var x = require('x-ray')(),
    hashomatic = require('hash-o-matic'),
    async = require('async'),
    _ = require('underscore'),
    nodemailer = require('nodemailer'),
    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PWD
        }
    }),
    mongoose = require('mongoose'),
    request = require('request').defaults({encoding: null}),
    fs = require('fs');

require(__dirname + '/../model');

var handleError = function (err)  {

    if (err) {

        if (err.key) {

            switch (err.key) {

                case 404:
                    //console.log('Product not found: ' + err.id);
                    break;

                case 500:
                    console.log('Product failed to parse: ' + err.id);
                    break;

            }
        }
    }

};

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

                writeStream.on('error', function (e) {
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

AliExpressScraper = function() {

    return {

        fetch: function() {

            var Product = mongoose.models.Product;
            var entities;

            async.series([

                function (cb) {

                    //if nothing then fake one - remove this
                    Product.find({
                        'source':'AE',
                        $or: [ { "isScraped": {"$exists": false} }, { "isScraped": false } ]})
                        .limit(1000).exec(function (err, docs) {

                        entities = docs;
                        return cb(err);

                    });

                },

                function (cb) {

                    async.eachLimit(entities, 5,

                        function (entity, cbMain) {

                            fetchImages(entity, function(err, result){

                                result.isScraped = true;
                                result.save(cbMain);
                            });

                        }, function (err) {

                            return cb(err);

                        });
                }

            ], function (err) {

                new AliExpressScraper().fetch();

            });

        },

        run: function () {

            var Product = mongoose.models.Product;

            var mailOptions = {
                from: 'AE Parser <noreply@geekenvy.io>',
                to: 'geek.envy.amazon@gmail.com, trent.millar@gmail.com',
                subject: 'NEW PRODUCTS',
                html: '<b>New Products - ' + new Date().toDateString() + '</b><p/>'
            };

            var updatedProducts = [];
            var newProducts = [];

            /*
             http://m.aliexpress.com/item/2005197291.html
             http://m.aliexpress.com/item-desc/2005197291.html
             http://m.aliexpress.com/getSiteProductEvaluation.htm?productId=32266892657
             */
            var params = {
                range: [1000357604 /*2005197290*/, 9999999999]
            };

            async.series([

                function (cb) {

                    //get highest AE id
                    Product.findOne({'source': 'AE'}).limit(1).sort('-externalId').exec(function (err, doc) {

                        if (err) return cb(err);
                        params.range[0] = Number(doc.externalId) + 1;
                        cb();

                    });

                },

                function (cb) {

                    async.doWhilst(
                        function (callback) {
                            var url = 'http://m.aliexpress.com/item/' + ++params.range[0] + '.html';
                            x(url, {
                                'page': 'body',
                                'title': 'p.ms-detail-subject'
                            })(function (err, obj) {

                                if (!obj || !obj.page) return callback();

                                var page = obj.page;
                                var title = obj.title;

                                if (page && page.length > 0) {

                                    var begin = 'var runParams =';

                                    if (!page.match(/runParams/gi)) {
                                        handleError({
                                            "key": 404,
                                            "id": params.range[0]
                                        });
                                        return callback();
                                    }

                                    try {
                                        var partial = page.substring(page.indexOf(begin) + begin.length);
                                        var javascript = partial.substring(0, partial.indexOf('};') + 1);

                                        //clean
                                        javascript = javascript.replace('// sku', '');

                                        var json = eval('(' + javascript + ')');

                                        json.title = title;
                                        json.hash = hashomatic.hash({
                                            "displayPrice": json.displayPrice
                                        }, true, true);

                                        Product.findOne({"externalId": json.productId}, function (err, doc) {

                                            if (doc) {

                                                if (doc.hash !== json.hash) {

                                                    updatedProducts.push({
                                                        'message': doc.price + ' now ' + json.price,
                                                        'title': json.title,
                                                        'link': url
                                                    });

                                                    Product.buildAliExpressProduct(json, function (err, entity) {

                                                        entity.previousProduct = doc;
                                                        entity.save(function (err, saved) {

                                                            Product.remove({_id: doc._id}, callback);

                                                        });

                                                    });

                                                } else {
                                                    //exists
                                                    return callback();
                                                }

                                            } else {

                                                newProducts.push({
                                                    'message': json.displayPrice,
                                                    'title': json.title,
                                                    'link': url
                                                });

                                                Product.buildAliExpressProduct(json, function (err, entity) {

                                                    fetchImages(entity, function(err, result){

                                                        result.isScraped = true;
                                                        return result.save(callback);

                                                    });

                                                });
                                            }

                                        });
                                    } catch (e) {

                                        handleError({
                                            "key": 500,
                                            "id": params.range[0]
                                        });
                                        return callback(err);

                                    }

                                } else {
                                    return callback();
                                }

                            });
                        },

                        function () {

                            return params.range[0] < params.range[1];

                        },

                        function (err) {

                            mailOptions.html += 'Updated</p><ul>@@update@@</ul><p/>New</p><ul>@@new@@</ul>';

                            var updates = '', news = '';
                            _.each(updatedProducts, function (product) {

                                updates += '<li><a href="' + product.link + '">' + product.title + '</a> - ' + product.message + '</li>';

                            });

                            _.each(newProducts, function (product) {

                                news += '<li><a href="' + product.link + '">' + product.title + '</a> - ' + product.message + '</li>';

                            });

                            mailOptions.html = mailOptions.html.replace('@@update@@', updates).replace('@@new@@', news);

                            transporter.sendMail(mailOptions, function (error, info) {
                                if (error) {
                                    console.log(error);
                                } else {
                                    console.log('Message sent: ' + info.response);
                                }

                                return cb();

                            });
                        });
                }

            ], function (err) {

                console.log('complete ' + err);

            });

        }
    }
}

module.exports.aescraper = new AliExpressScraper();