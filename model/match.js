var mongoose = require('mongoose'),
    hashomatic = require('hash-o-matic'),
    //cv = require('opencv'),
    async = require('async'),
    request = require('request').defaults({encoding: null}),
    fs = require('fs'),
    Schema = mongoose.Schema;


var generateGuid = function(){

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

function Match(){

    var matchSchema = new Schema({
        externalIdSource: String,
        externalIdDest: String,
        sourceFile: String,
        destFile: String,
        source: Schema.ObjectId,
        dest: Schema.ObjectId,
        destSource: String,
        srcSource: String,
        destUrl: String,
        srcUrl: String,
        title: String,
        hash: String,
        dissimilarity: Number,
        date: Date,
        sendMatchNotification: Boolean,
        sendNotificationDate: Date

    });

    matchSchema.virtual('generateHash').get(function(){

        var self = this;

        return hashomatic.hash({
            "1": self.externalIdSource,
            "2": self.externalIdDest,
            "3": self.sourceFile,
            "4": self.destFile,
            "5": self.destSource,
            "6": self.srcSource,
            "7": self.destUrl,
            "8": self.srcUrl,
            "9": self.title
        }, true, true);
    });

    matchSchema.statics.generateMatch = function(src, dst, func) {

        if(!src || !dst){
            return func();
        }

        var $this = new this();

        $this.externalIdSource = src.externalId;
        $this.externalIdDest = dst.externalId;
        $this.source = src._id;
        $this.dest = dst._id;
        $this.date = new Date();
        $this.dissimilarity = 9999;
        $this.sendMatchNotification = false;

        var srcImages = src.getImages;
        var dstImages = dst.getImages;

        $this.hash = hashomatic.hash({
            "1": src.externalId,
            "2": dst.externalId,
            "3": srcImages,
            "4": dstImages
        },true,true);

        var srcFiles = [], dstFiles = [];

        async.series([

            function(cb) {

                if(src.imageFiles && (src.imageFiles.length === srcImages.length)){
                    //return cb();
                }

                //clear array
                src.imageFiles=[];

                async.each(srcImages, function(image, callback){

                    var file = process.env.FILE_DROP + 'files/' + generateGuid() + '.jpg';
                    var writeStream = fs.createWriteStream(file);
                    writeStream.on('close', function() {

                        src.imageFiles.push(file);
                        return callback();

                    });

                    writeStream.on('error', function() {
                        console.log('failed');
                        return callback();
                    });

                    request(image).pipe(writeStream);


                    request({uri:image, encoding:'binary'}, function(err, r, body){
                        if (err) return callback(err);
                        if (!/image\//.test(r.headers['content-type'])) return callback('Not an image');

                        fs.writeFile(file+'_.jpg', body.image, 'base64', function(err) {
                            console.log(err);
                        });
                    });

                }, function(err){

                    if(err) return cb(err);

                    if(src.imageFiles && src.imageFiles.length > 0){

                        src.save(cb);

                    } else {

                        return cb();

                    }

                });


            },

            function(cb) {

                if(dst.imageFiles && (dst.imageFiles.length === dstImages.length)){
                    //return cb();
                }

                //clear array
                dst.imageFiles=[];

                async.each(dstImages, function(image, callback){

                    var file = process.env.FILE_DROP + 'files/' + generateGuid() + '.jpg';
                    var writeStream = fs.createWriteStream(file);
                    writeStream.on('close', function() {

                        dst.imageFiles.push(file);
                        return callback();

                    });

                    writeStream.on('error', function() {
                        return callback();
                    });

                    request(image).pipe(writeStream);

                }, function(err){

                    if(err) return cb(err);

                    if(dst.imageFiles && dst.imageFiles.length > 0){

                        dst.save(cb);

                    } else {

                        return cb();

                    }

                });

            },

            function(cb){

                async.each(src.imageFiles, function(image, callback){

                        /*cv.readImage(image, function(err, img) {

                            srcFiles.push(img);
                            callback();

                        });*/

                },cb);

            },

            function(cb){

                async.each(dst.imageFiles, function(image, callback){

                    /*cv.readImage(image, function(err, img) {

                        dstFiles.push(img);
                        callback();

                    });*/

                },cb);

            },

            function(cb){

                async.each(srcFiles, function(image, callback){

                    var srcImage = image;

                    async.each(dstFiles, function(image, callback2){

                        var dstImage = image;

                       /* cv.ImageSimilarity(srcImage, dstImage, function (err, dissimilarity) {
                            if (err) throw err;

                            if(dissimilarity < $this.dissimilarity) {
                                $this.dissimilarity = dissimilarity;
                            }

                            return callback2();
                        });*/

                    }, callback);

                }, function (err) {

                    if(err) return cb(err);

                    return $this.save(cb);

                });

            }

        ], function(err){

            if(err) return func(err);

            console.log('Match ' + $this.certainty > 80);

            return func(null, $this.certainty);

        });


    }

    return mongoose.model('Match', matchSchema);

}

module.exports = new Match();