const router = require('express').Router();
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV);
const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendEmail = require('../../service/email');
const { send } = require('express/lib/response');

// Register
// 1. Menerima kiriman username, email, password, confirm-password
// 2. ngecek email, validasi password....
// 3. Membuat Token untuk validasi registrasi melalui email.
// 4. Update user menjadi verified.
const UsersTable = process.env.MS_USERS;

const isUserExist = async (email) => {
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config.config);
        const { rows } = await connection.execute(`
            SELECT * FROM ${UsersTable} WHERE email= :email`
            , [email]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        console.log(rows.length);
        if (rows.length > 0) {
            console.log("Enter")
            results = true;
        }
        results = false;
    } catch (err) {
        console.error(err);
        return true;
    } finally {
        if (connection) {
            try {
                await connection.close();
                return results;
            } catch (err) {
                console.error(err);
                return true;
            }
        }
    }
}

const insertUserToDatabase = async (newUser) => {
    let connection;
    try {
        connection = await oracledb.getConnection(config.config);
        // Prepare Data. Hash password
        const salt = bcrypt.genSaltSync(Number(process.env.SALT_ROUNDS));
        const hashedPassword = bcrypt.hashSync(newUser.password, salt);

        const result = await connection.execute(
            `INSERT INTO ${UsersTable} (username, email, password,verified) VALUES(:username, :email, :password, :verified)`
            , [newUser.username, newUser.email, hashedPassword, '0'],
            { autoCommit: true }
        );
        console.log(result);
        console.log("Rows inserted: " + result.rowsAffected);  // 1
        console.log("ROWID of new row: " + result.lastRowid);
        return result.lastRowid;
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

const verifyUser = async (email) => {
    let connection;
    let result;
    try {
        connection = await oracledb.getConnection(config.config);
        result = await connection.execute(
            `
            UPDATE ${UsersTable}
            SET verified = :verif
            WHERE email = :email
            `,
            ['1', email],
            { autoCommit: true }
        )
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                return result;
            } catch (error) {
                console.error(error);
            }
        }
    }
}

const checkUserPassword = async (username, password) => {
    let connection;
    try {
        connection = await oracledb.getConnection(config.config);
        const { rows } = await connection.execute(
            `
            SELECT * FROM ${UsersTable}
            WHERE username = :username AND VERIFIED = 1
            `
            , [username]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
        if (rows.length > 0 && bcrypt.compareSync(password, rows[0].PASSWORD)) {
            return { login: true, data: rows[0] }
        } else {
            return { login: false };
        }
    } catch (err) {
        console.log(err);
        return { login: false };
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error(error);
            }
        }
    }
}

const getUserByEmail = async (email) => {
    let connection;
    let userData;
    try {
        connection = await oracledb.getConnection(config.config);
        const { rows } = await connection.execute(
            `SELECT * FROM ${UsersTable} WHERE email = :email`
            , [email]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        userData = rows[0];
        delete userData.PASSWORD;
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                return userData;
            } catch (err) {
                console.error(err);
            }
        }
    }
}

router.post('/register', async (req, res) => {
    try {
        const { username, email } = req.body;
        // Lakukan validasi
        if (await isUserExist(email)) {
            return res.status(403).json({ status: false, message: "User already exist!" })
        }
        // Masukin DB
        const id = await insertUserToDatabase(req.body);

        // Create Token
        const token = jwt.sign({ username, email }, process.env.TOKEN_PRIVATE_KEY, { expiresIn: '20m' });

        // Kirim token ke email
        sendEmail(email, token, "Register User");
        return res.json({ status: true, message: "Email has been sent!" })
    } catch (err) {
        console.log(err);
        return res.json({ status: false, message: err.message })
    }
})

router.post('/verify-user', async (req, res) => {
    try {
        const { token } = req.body;
        const { email } = jwt.verify(token, process.env.TOKEN_PRIVATE_KEY);
        console.log(email);
        const result = await verifyUser(email);
        return res.json({ status: true, data: result });
    } catch (err) {
        return res.status(401).json({ message: "Token Expired" });
    }
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const results = await checkUserPassword(username, password);
    if (results.login) {
        delete results.data.PASSWORD;
        const token = jwt.sign(results.data, process.env.API_PRIVATE_KEY, { expiresIn: '10h' });
        return res.cookie("token", token).json({ status: true, token, data: results.data });
    } else {
        return res.status(401).json({ status: false, message: "Username or Password is incorrect!" });
    }
})

router.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    const userData = await getUserByEmail(email);
    if (userData) {
        const token = jwt.sign(userData, process.env.TOKEN_PRIVATE_KEY, { expiresIn: '20m' });
        sendEmail(email, token, "Forget Password");
    }
    return res.json({ status: true, message: "Forget password instruction has been sent to your email!" });
})

router.post('/verify-forget-token', (req, res) => {
    const { token } = req.body;
    if (token) {
        const userData = jwt.verify(token, process.env.TOKEN_PRIVATE_KEY);
        return res.json({ status: true, data: userData });
    }
    return res.status(401).json({ message: "Token Expired" });
})

router.post('/reset-password', async (req, res) => {
    const { id, password } = req.body;
    if (id && password) {
        const salt = bcrypt.genSaltSync(Number(process.env.SALT_ROUNDS));
        const hashedPassword = bcrypt.hashSync(newUser.password, salt);
        let connection;
        let data;
        try {
            connection = await oracledb.getConnection(config.config);
            const { rows } = await connection.execute(
                `UPDATE ${UsersTable} SET PASSWORD=:pass WHERE ID = :id`
                , [hashedPassword, id]
                , { autoCommit: true }
            )
            data = rows;
        } catch (err) {
            return res.status(500).json({ status: false, message: err.message });
        } finally {
            if (connection) {
                try {
                    await connection.close();
                    return res.json({ status: true, data });
                } catch (err) {
                    return res.status(500).json({ status: false, message: err.message });
                }
            }
        }
    }
    return res.status(422).json({ status: false, message: "Id and Password is needed to perform this action" });
})

module.exports = router;