const Pool = require('pg').Pool;
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

module.exports = pool

// const oracledb = require('oracledb');
// const fs = require('fs');
// let libPath;
// if (process.platform === 'win32') {           // Windows
//     libPath = 'C:\\oracle\\instantclient_21_3';
// } else if (process.platform === 'linux') {
//     libPath = './instantclient_21_5'
// }
// if (libPath && fs.existsSync(libPath)) {
//     oracledb.initOracleClient({ libDir: libPath });
// }

// const config = {
//     driver: "oracle",
//     config: {
//         user: process.env.DB_USER,
//         password: process.env.DB_PASS,
//         connectionString: process.env.DB_CONN_STRING
//     }
// }

// module.exports = config;

// di file yang mau pakai config Db Oracle
// =======================================
// const sworm = require('sworm')
// router.get('/user',(req,res)=>{
//     const db = sworm.db(config);
//     const rows = await db.query(`SELECT * FROM ${UsersTable}`;
// })

// Dockerfile to build image
// ==========================
// FROM node: 17 - buster
//
// RUN apt - get update && apt - get install - y libaio1 wget unzip
//
// WORKDIR / opt / oracle
//
// RUN wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip && \
//     unzip instantclient - basiclite - linuxx64.zip && rm - f instantclient - basiclite - linuxx64.zip && \
// cd / opt / oracle / instantclient * && rm - f * jdbc * * occi * * mysql * * mql1 * * ipc1 * * jar uidrvci genezi adrci && \
// echo / opt / oracle / instantclient * > /etc/ld.so.conf.d / oracle - instantclient.conf && ldconfig
//
// WORKDIR / backend
// COPY. / backend /
// ENV LD_LIBRARY_PATH = /opt/oracle / instantclient_21_5 /: $LD_LIBRARY_PATH
// RUN npm install
// CMD["npm", "start"]






// Connect to Oracle DB

