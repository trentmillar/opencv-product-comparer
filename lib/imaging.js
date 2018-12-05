require('dotenv').load();

var async = require('async'),
    _ = require('underscore'),
    util = require('util'),
    mongoose = require('mongoose'),
    hashomatic = require('hash-o-matic'),
    fs = require('fs');


var generateGuid = function(){

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

Imaging = function() {

    return {

        run: function (finished) {

            require(__dirname + '/../model');
            var Product = mongoose.models.Product;
            var Match = mongoose.models.Match;

            var dir = process.env.FILE_DROP + 'files/';
            var files = [];
            var matches = [];

            var cv;
            try{
                //cv = require('opencv');
            } catch(e){
                return finished(e);
            }

            async.series([

                function (cb) {

                    files = [];
                    matches = [];

                    fs.readdir(dir,function(err,results){
                        if (err) cb(err);

                        files = results;

                        return cb();
                    });


                },

                function (cb) {

                    var _srcImg;
                    var _match;
                    var go = true;

                    async.doWhilst(
                        function (callback) {

                            async.series([

                                function (cb2) {

                                    if(files.length === 0){
                                        //get out of here
                                        go = false;
                                        return callback();
                                    }

                                    var file = files.shift();

                                    _match = new Match();
                                    _match.sourceFile = file;
                                    _match.date = new Date();
                                    _match.sendMatchNotification = false;

                                    try {
                                        cv.readImage(dir + file, function (err, img) {
                                            if (err) {
                                                return cb2(err);
                                            }
                                            _srcImg = img;
                                            cb2();

                                        });
                                    }
                                    catch(e){
                                        cb2(e);
                                    }
                                },

                                function (cb2) {

                                    var dstFile;

                                    async.eachLimit(files, 10, function (file, callback2) {

                                        _match.destFile = file;

                                        var dstImg;
                                        dstFile = dir + file;

                                        async.series([

                                            function (cbBuild) {

                                                try {
                                                    cv.readImage(dstFile, function (err, img) {

                                                        if (err) {
                                                            return cbBuild(err);
                                                        }

                                                        dstImg = img;
                                                        return cbBuild();

                                                    });
                                                } catch(e){
                                                    cbBuild(e);
                                                }
                                            },

                                            function(cbBuild){

                                                try {
                                                    cv.ImageSimilarity(_srcImg, dstImg, function (err, dissimilarity) {
                                                        if (err) {
                                                            return cbBuild(err);
                                                        }

                                                        _match.dissimilarity = dissimilarity;
                                                        matches.push(_match);
                                                        return cbBuild();
                                                    });
                                                } catch(e){
                                                    cbBuild(e);
                                                }

                                            }

                                        ], function (err) {

                                            callback2(err);
                                        });


                                    }, function (err) {

                                        return cb2(err);

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

                            cb(err);

                        });
                },

                function(cb){

                    async.each(matches, function(match, cbMatch){

                        async.series([

                            function(cbSave){

                                var key = /match.sourceFile/gmi;

                                Product.findOne({imageFiles: {$in:[key]}})
                                    .exec(function(err, src){

                                        if(err) return cbSave(err);
                                        if(!src) return cbSave('No match for ' + match.sourceFile);

                                        _match.externalIdSource = src.externalId;
                                        _match.source = src._id;
                                        _match.srcSource = src.source;
                                        _match.title = src.title;
                                        _match.srcUrl = src.url;

                                        return cbSave();
                                });
                            },

                            function(cbSave){

                                var key = /match.destFile/gmi;

                                Product.findOne({imageFiles: {$in:[key]}})
                                    .exec(function(err, dst){

                                        if(err) return cbSave(err);
                                        if(!dst) return cbSave('No match for ' + match.destFile);

                                        _match.externalIdDest = dst.externalId;
                                        _match.dest = dst._id;
                                        _match.destSource = dst.source;
                                        _match.destUrl = dst.url;

                                        return cbSave();
                                    });
                            },

                            function(cbSave){

                                _match.hash = _match.generateHash;

                                Match.count({hash: _match.hash}, function(err, c){

                                    if(c > 0) return cbSave(true);

                                    return cbSave(err);
                                });

                            },

                            function(cbSave){

                                _match.save(cbSave);

                            }

                        ], function(err){

                            return cbMatch();

                        });

                    }, function(err){

                        return cb(err);

                    });

                }

            ], function (err) {

                return finished(err);

            });

        }
    }
}

module.exports.imaging = new Imaging();