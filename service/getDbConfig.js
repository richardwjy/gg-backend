const { config_prod, config_dev } = require('./db_ora');

const getDBConfig = () => {
    const env = process.env.APP_ENV;
    let configFile;
    switch (env) {
        case "PROD":
            configFile = config_prod;
            break;
        case "DEV":
            configFile = config_dev;
            break;
    }
    return configFile;
}

module.exports = getDBConfig;