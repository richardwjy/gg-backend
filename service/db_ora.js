const sworm = require('sworm')
const oracledb = require('oracledb');
const fs = require('fs');

let libPath;
if (process.platform == 'win32') {
    libPath = 'C:\\oracle\\instantclient_21_3'
} else if (process.platform === 'linux') {
    libPath = './instantclient_21_5'
}

if (libPath && fs.existsSync(libPath)) {
    oracledb.initOracleClient({ libDir: libPath });
}

const config_prod = {
    driver: "oracle",
    config: {
        username: process.env.DB_ORACLE_USERNAME,
        password: process.env.DB_ORACLE_PASSWORD,
        connectionString: process.env.DB_ORACLE_CONN_STRING
    }
}

const config_dev = {
    driver: "oracle",
    config: {
        username: process.env.DB_ORACLE_USERNAME_DEV,
        password: process.env.DB_ORACLE_PASSWORD_DEV,
        connectionString: process.env.DB_ORACLE_CONN_STRING_DEV
    }
}

module.exports = { config_prod, config_dev };