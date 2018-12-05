var config = {};

config.mail = {};
config.mail = {
    apikey: process.env.mailchimp || null,
    listid: process.env.mailchimp_listid || null,
    mailchimp: '',
    apiurl: parseMailApiUrl(process.env.mailchimp_api_url),
    mailchimp_doubleoptin: process.env.mailchimp_doubleoptin || true,
    mailchimp_allowupdates: process.env.mailchimp_allowupdates || true
};


/* MongoDb */
/*
config.db = {};
config.db = {
    databaseUsername: process.env.databaseUsername || '',
    databasePassword: process.env.databasePassword || '',
    databaseHost: process.env.databaseHost || 'localhost',
    databaseName: process.env.databaseName || 'oasis',
    databasePort: process.env.databasePort || 27017
};

config.db.databaseMongoUri = {};

config.db.databaseMongoUri = process.env.databaseMongoUri || config.db.databaseHost +
    ':' + config.db.databasePort + '/' + config.db.databaseName + '?connectTimeoutMS=30000&w=1';

config.db.databaseUri = 'mongodb://' + config.db.databaseUsername +
    (config.db.databaseUsername === "" ? '' : ':') + config.db.databasePassword +
    (config.db.databaseUsername === "" ? '' : '@') + config.db.databaseMongoUri;
*/
config.db = {};
config.db = {
    databaseUsername: process.env.databaseUsername || '',
    databasePassword: process.env.databasePassword || '',
    databaseHost: process.env.databaseHost || 'localhost',
    databaseName: process.env.databaseName || 'oasis',
    databasePort: process.env.databasePort || 27017
};

var credentials = (config.db.databaseUsername && config.db.databasePassword)
    ? config.db.databaseUsername + ':' + config.db.databasePassword + '@'
    : '';


config.db.databaseMongoUri = 'mongodb://' + credentials + config.db.databaseHost +
':' + config.db.databasePort + '/' + config.db.databaseName;

if(process.env.databaseHost2 && process.env.databasePort2) {
    config.db.databaseMongoUri += ',mongodb://' + credentials + process.env.databaseHost2 +':' +
    process.env.databasePort2 + '/' + config.db.databaseName;
}

if(process.env.databaseHost3 && process.env.databasePort3) {
    config.db.databaseMongoUri += ',mongodb://' + credentials + process.env.databaseHost3 +':' +
    process.env.databasePort3 + '/' + config.db.databaseName;
}

//config.db.databaseMongoUri += '/' + config.db.databaseName + '?connectTimeoutMS=30000&w=1&authMechanism=MONGODB-CR';

config.db.databaseUri = config.db.databaseMongoUri;

config.db.databaseConnectionTimeout = Number(process.env.databaseConnectionTimeout || 30000);

/* Redis */
config.keystore = {};
config.keystore = {
    databaseHost: process.env.redisHost || 'localhost',
    databasePort: process.env.redisPort || 6379,
    databaseAuth: process.env.redisPrimaryKey || process.env.redisSecondaryKey || null
};

/* Logging */
config.logging = {};
config.logging = {
    filename: process.env.LOGGER_FILENAME,
    level: process.env.LOGGER_LEVEL,
    azure_account: process.env.LOGGER_AZURE_ACCOUNT,
    azure_key: process.env.LOGGER_AZURE_KEY,
    azure_table: process.env.LOGGER_AZURE_TABLE
};

module.exports = config;