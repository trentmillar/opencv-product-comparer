var mongoose = require('mongoose'),
    hashomatic = require('hash-o-matic'),
    _ = require('underscore'),
    async = require('async'),
    Schema = mongoose.Schema;


function Criteria(){

    var criteriaSchema = new Schema({
        operation: String, // ItemLookup REQUIRED
        searchIndex: String,// Books
        keywords: String, // harry potter
        responseGroup: String, // ItemAttributes,Offers [http://docs.aws.amazon.com/AWSECommerceService/latest/DG/CHAP_ResponseGroupsList.html]
        itemId: String, // ASIN
        merchantId: String, // Amazon (ONLY VALUE ALLOWED)
        condition: String, // All, New, Used

        minPrice: Number,
        maxPrice: Number,

        date: Date,
        disabled: Boolean,
        lastRunDate: Date

    });

    criteriaSchema.virtual('amazonCriteria').get(function(){

        var self = this;

        var criteria = {};
        if(self.searchIndex && self.searchIndex.length > 0)
            criteria.SearchIndex = self.searchIndex;
        if(self.keywords && self.keywords.length > 0)
            criteria.Keywords = self.keywords;
        if(self.responseGroup && self.responseGroup.length > 0)
            criteria.ResponseGroup = self.responseGroup;
        //if(self.itemId && self.itemId.length > 0)
        //    criteria.ItemId = self.itemId;
        //if(self.merchantId && self.merchantId.length > 0)
        //    criteria.MerchantId = self.merchantId;

        // Note, if condition then must search for item id
        //if(self.condition && self.condition.length > 0)
            //criteria.Condition = self.condition;

        criteria.clean = function(){

            var $this = this;

            var valid = ['SearchIndex', 'Keywords', 'ResponseGroup', 'MinimumPrice', 'MaximumPrice', 'VariationPage'];
            _.each(Object.keys($this), function(key){

                if(valid.indexOf(key) >= 0) return;

                delete $this[key];

            });

        }

        return criteria;
    });

    return mongoose.model('Criteria', criteriaSchema);

}

module.exports = new Criteria();