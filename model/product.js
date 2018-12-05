var mongoose = require('mongoose'),
    hashomatic = require('hash-o-matic'),
    _ = require('underscore'),
    Schema = mongoose.Schema;

function Product(){

    var freightSchema = new Schema({
        origin: String, //sendGoodsCountryFullName
        originISO: String, //sendGoodsCountry
        domesticFreight: String, //domesticFreight
        totalFreight: String, //totalFreight
        currencyCode: String, //currency
        discountPercentage: Number, //discount
        totalDiscount: String, //saveMoney
        shippingPeriod: String, //time
        actualPrice: String, //price
        discountType: String, //discountType
        commitDay: String, //commitDay
        shipperCode: String, //serviceName
        shipperName: String //company
    },{ _id: false });

    var propertySchema = new Schema({
        key: String,
        value: String
    },{ _id: false });

    var skuSchema = new Schema({
        externalId: String, //skuProducts@key
        isActivity: Boolean, //isActiviy
        price: String, //skuPrice
        inventoryCount: Number, //count
        images: [String], //skuPropertyImageSummPath
        properties: [propertySchema],
        /*type: String, //skuPropertyName
        value: String, //propertyValueName*/
        hash: String //hash
    },{ _id: false });

    var sellerSchema = new Schema({
        availability: String,
        isExpedited: Boolean,
        price: String,
        location: String,
        sellerStoreUrl: String,
        sellerRating: String,
        shippingPrice: String
    },{ _id: false });

    var productSchema = new Schema({
        externalId: String, //productId
        title: String, //title
        source: String, // AE
        images: [String], //imageUrls
        matrices: [String], //opencv matrices
        added: Date, // new Date()
        url: String, // generate
        items: [skuSchema],
        freight: [freightSchema],
        unit: String, //displayUnit
        price: String, //displayPrice[1]
        currencyCode: String, //displayPrice[0]
        isFreeShipping: Boolean, //isFreeShipping
        isItemOffline: Boolean, //isItemOffline
        targetCountry: String, //userCountryName
        targetCountryCode: String, //userCountryCode
        hash: String, //hash,
        newNotificationDate: Date,
        sendUpdatedNotification: Boolean,
        updatedNotificationDate: Date,
        previousProduct: Schema.Types.Mixed,
        imageFiles:[String],
        imageData: [String],
        inventoryCount: Number,

        sellers:[sellerSchema],
        offerUrl: String,
        isScraped: Boolean,
        relatedLinks: [String],
        keywords: [String],
        sellerCount: Number,
        salesRank: Number,
        group: String,
        category: String,
        handlingDays: Number,
        isFba: Boolean,
        dump: String,

        reviews: Number,
        brand: String,
        properties: [propertySchema]

    });

    productSchema.virtual('getImages').get(function(){

        var images = this.images;

        if( Object.prototype.toString.call( images ) !== '[object Array]' ) {
            images = [];
        }

        for(var x = 0; x < this.items.length; x++){

            var item = this.items[x];
            for(var y = 0; y < item.images.lenght; y++) {

                var image = item.images[y];

                if(image && image.length > 0){

                    images.push(image);

                }

            };
        }

        return images;

    });

    /*
     uri: 'http://www.amazon.com/gp/product/B00Z9MOZ14/ref=s9_ri_bw_g23_i20/183-5518956-5356440?pf_rd_m=ATVPDKIKX0DER&pf_rd_s=merchandised-search-6&pf_rd_r=09797QFH4GCN7EQ8X6B9&pf_rd_t=101&pf_rd_p=2130231282&pf_rd_i=1055398',
     title: 'Peakeep Digital Alarm Clock Battery Operated with Dual Alarms and Snooze Function - Travel Alarm Clock and Home Alarm Clock - Optional Weekday Alarm Mode and Sensor Light',
     reviewCount: '19 customer reviews',
     brand: 'Peakeep',
     priceBlock: '$15.99',
     properties:
     [ { key: 'Brand Name', value: 'Peakeep' },
     { key: 'Model Number', value: 'MHP3112B' },
     { key: 'Product Dimensions',
     value: '5.2 x 1.8 x 3.1 inches ; 7 ounces' },
     { key: 'Shipping Weight',
     value: '7.2 ounces (View shipping rates and policies)' },
     { key: 'ASIN', value: 'B00Z9MOZ14' },
     { key: 'Item model number', value: 'MHP3112B' },
     { key: 'Date first available at Amazon.com',
     value: 'June 9, 2015' } ],
     images:
     [ 'http://ecx.images-amazon.com/images/I/51xAF2EnacL.jpg',
     'http://ecx.images-amazon.com/images/I/51CGEEwepEL.jpg',
     'http://ecx.images-amazon.com/images/I/51K317w6HKL.jpg',
     'http://ecx.images-amazon.com/images/I/41ad3l-jYQL.jpg',
     'http://ecx.images-amazon.com/images/I/41VTK2%2BWVSL.jpg',
     'http://ecx.images-amazon.com/images/I/41xKv1k6xnL.jpg' ] }
     */
    productSchema.statics.buildAmazonProduct = function (obj, cb) {

        if(!obj){
            return cb();
        }

        var $this = new this();

        $this.url = obj.uri;
        $this.title = obj.title;
        $this.brand = obj.brand;
        $this.price = obj.priceBlock.replace('$','');

        if(obj.reviewCount){
            var test = obj.reviewCount.match(/\d+\,\d+/);
            if(test){
                $this.reviews = Number(test[0].replace(',', ''));
            }
        }

        for(var x = 0; x < obj.images.length;x++){

            $this.images.push(obj.images[x]);

        }

        for(var x = 0; x < obj.properties.length;x++){

            $this.properties.push(obj.properties[x]);

        }

        var id = $this.url.match(/\/product\/\w+/);

        if(!id){
            return cb('Unable to parse ID from url ' + $this.url);
        }

        $this.externalId = id[0].replace('/product/', '').replace(/\//gmi, '');
        $this.source = 'AMZN';
        $this.source += ($this.url.match(/\.com/)) ? '-US' : '-CA';
        $this.added = new Date();
        $this.sendUpdatedNotification = false;

        $this.hash = hashomatic.hash({
            "price": $this.price
        }, true, true);

        return cb(null, $this);
    };

    productSchema.statics.buildAliExpressProduct = function (obj, cb) {

        if(!obj){
            return cb();
        }

        var $this = new this();

        $this.externalId = obj.productId;
        $this.title = obj.title;
        $this.source = 'AE';
        $this.images = obj.imageUrls;
        $this.added = new Date();
        $this.url = 'http://www.aliexpress.com/item/-/'+obj.productId+'.html';
        $this.unit = obj.displayUnit;
        $this.isFreeShipping = obj.isFreeShipping;
        $this.isItemOffline = obj.isItemOffline;
        $this.targetCountry = obj.userCountryName;
        $this.targetCountryCode = obj.userCountryCode;
        $this.sendUpdatedNotification = false;

        var split = obj.displayPrice.split(" ");
        if(split.length > 1) {
            $this.price = split[1].replace('$','');
            $this.currencyCode = split[0];
        }

        $this.hash = hashomatic.hash({
            "displayPrice": obj.displayPrice
        }, true, true);

        for(var x = 0; x < obj.skuProducts.length; x++){

            var item = obj.skuProducts[x];
            var sku = item.skuPropIds;
            var detail = item[sku];

            if(!detail) continue;

            if(sku.match(/,/)) sku = sku.split(",")[0];

            var meat = {
                externalId: sku,
                isActivity: detail.isActivity,
                price: detail.skuPrice,
                inventoryCount: detail.count,
                images: [],
                properties:[]
            };

            for(var y = 0; y < obj.skuPropertyList.length; y++){
                var property = obj.skuPropertyList[y];

                for(var z = 0; z < property.skuPropertyValues.length; z++){
                    var value = property.skuPropertyValues[z];

                    if(value.propertyValueId == sku) {

                        if(value.skuPropertyImageSummPath){
                            meat.images.push(value.skuPropertyImageSummPath);
                        }
                        meat.properties.push({
                            key: property.skuPropertyName,
                            value: value.propertyValueName
                        });
                        break;
                    }
                }
            }

            $this.items.push(meat);

        }

        for(var x = 0; x < obj.freightItems.length; x++) {

            var item = obj.freightItems[x];

            $this.freight.push({

                origin: item.sendGoodsCountryFullName,
                originISO: item.sendGoodsCountry,
                domesticFreight: item.domesticFreight,
                totalFreight: item.totalFreight,
                currencyCode: item.currency,
                discountPercentage: item.discount,
                totalDiscount: item.saveMoney,
                shippingPeriod: item.time,
                actualPrice: item.price,
                discountType: item.discountType,
                commitDay: item.commitDay,
                shipperCode: item.serviceName,
                shipperName: item.company

            });

        }

        return cb(null, $this);
    };

    productSchema.statics.buildAmazonApiProduct = function (obj, cb) {

        if(!obj){
            return cb();
        }

        var $this = new this();

        $this.dump = JSON.stringify(obj,null,0);

        $this.source = 'AMZN';
        $this.isScraped = false;
        //$this.source += ($this.url.match(/\.com/)) ? '-US' : '-CA';
        $this.added = new Date();
        $this.sendUpdatedNotification = false;
        $this.externalId = obj.ASIN[0];
        $this.url = obj.DetailPageURL[0];

        if(obj.ImageSets && obj.ImageSets.length >0) {

            _.each(obj.ImageSets[0].ImageSet, function (imageset) {

                $this.images.push(imageset.MediumImage[0].URL[0]);

            });

        }

        if(obj.SimilarProducts && obj.SimilarProducts.length > 0) {
            var similar = obj.SimilarProducts[0].SimilarProduct;

            _.each(similar, function (compare) {

                $this.keywords.push(compare.Title[0]);
                $this.relatedLinks.push('http://www.amazon.com/gp/product/'+compare.ASIN[0]);

            });
        }
        var attr = obj.ItemAttributes[0];

        $this.group = attr.ProductGroup[0];

        $this.category = (attr.Binding || attr.ProductGroup)[0];
        $this.brand = (attr.Brand || ['UNKNOWN'])[0];

        $this.properties.push({key: 'dump', value: JSON.stringify(attr)});

        if(attr.Color && attr.Color.length > 0)
            $this.properties.push({key:'color', value: attr.Color[0]});

        if(attr.EAN && attr.EAN.length > 0)
            $this.properties.push({key:'EAN', value: attr.EAN[0]});

        $this.title = attr.Title[0];

        var i = 0;
        _.each(attr.Feature, function(feature){

            var goods = feature;

            if(/:/.test(goods)){

                var split = goods.split(':');
                $this.properties.push({key:split[0],value:split[1]});

            } else {
                $this.keywords.push(goods);
            }

        });
        if(attr.Label && attr.Label.length > 0) $this.keywords.push(attr.Label[0]);
        if(attr.Brand && attr.Brand.length > 0) $this.keywords.push(attr.Brand[0]);
        if(attr.Manufacturer && attr.Manufacturer.length > 0) $this.keywords.push(attr.Manufacturer[0]);
        $this.keywords.push(attr.Title[0]);

        if(obj.SalesRank && obj.SalesRank.length > 0)
            $this.salesRank = Number(obj.SalesRank[0]);

        var offersummary = obj.OfferSummary[0];

        if(offersummary.LowestNewPrice && offersummary.LowestNewPrice.length > 0) {
            $this.price = offersummary.LowestNewPrice[0].Amount[0] / 100;
            $this.currencyCode = offersummary.LowestNewPrice[0].CurrencyCode[0];
        }

        $this.sellerCount = offersummary.TotalNew[0];
        $this.hasReviews = obj.CustomerReviews[0].HasReviews[0] == "true";

        var offers = obj.Offers[0];

        if(offers.Offer && offers.Offer.length > 0) {

            var offer = offers.Offer[0].OfferListing[0];

            $this.merchant = offers.Offer[0].Merchant[0].Name[0];

            var offerUrl = (offers.MoreOffersUrl["0"]).match(/http:\/\/[a-z0-9_-].+?%/i);

            if (offerUrl) {
                $this.offerUrl = offerUrl[0].replace('%', '');
            }

            $this.handlingDays = Number(offer.AvailabilityAttributes[0].MaximumHours) / 24;

            $this.isFba = offer.IsEligibleForPrime[0] == 1 || offer.IsEligibleForSuperSaverShipping[0] == 1;
        }

        $this.hash = hashomatic.hash({
            "price": $this.price,
            "isFba": $this.isFba,
            "sellerCount": $this.sellerCount
        }, true, true);

        return cb(null, $this);
    }


    return mongoose.model('Product', productSchema);

}

module.exports = new Product();