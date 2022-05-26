const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const oracledb = require('oracledb');
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV).config;
const redisClient = require('../../service/redisClient');

const UsersTable = process.env.MS_USERS;

const checkUserPassword = async (username, password) => {
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config);
        const { rows } = await connection.execute(
            `
            SELECT * FROM ${UsersTable}
            WHERE username = :username AND VERIFIED = 1
            `
            , [username]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
        if (rows.length > 0 && bcrypt.compareSync(password, rows[0].PASSWORD)) {
            results = { login: true, data: rows[0] };
        } else {
            results = { login: false, message: "Username or Password is incorrect!" };
        }
    } catch (err) {
        console.log(err);
        results = { login: false };
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(error);
            }
        }
        if (results) {
            return results;
        }
    }
}

router.post('/login', async (req, res) => {
    const { username, password, fcmToken } = req.body;
    if (!username && !password && !fcmToken) { return res.status(422).json({ status: false, message: "Wrong Payload!" }) }
    const results = await checkUserPassword(username, password);
    if (results.login) {
        delete results.data.PASSWORD;
        const token = jwt.sign({ ...results.data }, process.env.MOBILE_PRIVATE_KEY, { expiresIn: '10h' });
        const userFcmToken = await redisClient.getOrSetCache(`user-fcm:${results.data.ID}`, () => {
            return fcmToken;
        });
        return res.json({
            status: true, access_key: `Bearer ${token}`, data: {
                ...results.data
                , userFcmToken
            }
        });
    } else {
        return res.status(401).json({ status: false, message: results.message || "Unauthorized" })
    }
})

module.exports = router;