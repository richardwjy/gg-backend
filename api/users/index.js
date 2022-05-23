const router = require('express').Router();
// const db = require('../../service/db');
const sworm = require('sworm');
const oracledb = require('oracledb');
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV);
const verifyToken = require('../../service/verifyToken');

// router.use(verifyToken);

const users = [{ id: 1, name: "Richard" }, { id: 2, name: "Rostandy" }, { id: 3, name: "richard" }]

const UsersTable = process.env.MS_USERS;

router.post('/get-all-sworm', async (req, res) => {
    try {
        const db = sworm.db(config);
        const rows = await db.query(`SELECT * FROM ${UsersTable}`);
        return res.status(200).json({
            status: true,
            data: rows
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: false,
            message: err.message
        })
    }
})

router.get('/get-all-oracledb', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection({
            username: process.env.DB_ORACLE_USERNAME,
            password: process.env.DB_ORACLE_PASSWORD,
            connectionString: process.env.DB_ORACLE_CONN_STRING
        });
        const { rows } = await connection.execute(`SELECT * FROM ${UsersTable}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return res.json({ data: rows })
    } catch (err) {
        console.log(err);
        return res.json({ err });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
})

router.get('/get-by-oracledb', async (req, res) => {
    // 1. Create Procedure
    // 2. Run Procedure
    let connection;
    try {
        connection = await oracledb.getConnection({
            username: process.env.DB_ORACLE_USERNAME,
            password: process.env.DB_ORACLE_PASSWORD,
            connectionString: process.env.DB_ORACLE_CONN_STRING
        });
        // const { rows } = await connection.execute(`SELECT * FROM ${UsersTable}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        await connection.execute(
            `CREATE OR REPLACE PROCEDURE get_user_email (
                p_in IN VARCHAR2,
                p_out OUT VARCHAR2
            )
            IS
            BEGIN
                SELECT email INTO p_out FROM ${UsersTable} where username = p_in;
            END;`
        );
        const result = await connection.execute(
            `
            BEGIN
                get_user_email(:input,:outputEmail);
            END;
            `, { input: 'Erick', outputEmail: { type: oracledb.STRING, dir: oracledb.BIND_OUT } }
        );
        return res.json({ data: result.outBinds })
    } catch (err) {
        console.log(err);
        return res.json({ err });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
})

router.get('/:userId', async (req, res) => {
    const { userId } = req.params;
    // console.log(req.query);
    if (userId === undefined) {
        return res.status(422).json({ status: false, message: "User id is not defined" })
    }
    // const foundUser = users.filter((user) => user.id === Number(userId));
    // console.log(foundUser);
    // if (!foundUser) {
    //     return res.status(204);
    // }
    // return res.json({ status: true, data: foundUser });
    try {
        const db = sworm.db(config);
        const rows = await db.query(`SELECT * FROM ${UsersTable} WHERE ID=${userId}`);
        return res.json({ status: true, data: rows });
    } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
    }
})

router.post('/create', async (req, res) => {

    // const generatedId = users.sort((a, b) => b.id - a.id)[0]?.id + 1;
    // newUser.id = generatedId || 0;
    // users.push(newUser);
    try {
        const newUser = req.body;
        console.log(newUser);
        const db = sworm.db(config);
        // Cara 1 - Pakai sworm
        const userModel = db.model({ table: UsersTable });
        const insertedUser = userModel({
            username: newUser.username,
            password: newUser.password,
            email: newUser.email
        });
        await insertedUser.insert();

        // Cara 2 - Insert Manual
        // const queryString = `INSERT INTO ${UsersTable}(username, password, email) VALUES ('${newUser.username}', '${newUser.password}', '${newUser.email}');`;
        // console.log(queryString);
        // const rows = await db.query(queryString);
        return res.json({ status: true, data: insertedUser });
    } catch (err) {
        console.log(err);
        return res.json({ status: false, message: err.message })
    }

})

router.delete('/:userId', async (req, res) => {
    const { userId } = req.params;
    // users.splice(users.findIndex(user => user.id == userId), 1);
    try {
        const db = sworm.db(config);
        const deletedRow = await db.query(`DELETE FROM ${UsersTable} WHERE ID=${userId}`);
        // console.log(deletedRow);
        return res.json({ status: true });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err.message });
    }
    return res.json({ status: true, data: users });
})

router.put('/update', async (req, res) => {
    try {
        const updateUser = req.body;
        const db = sworm.db(config);
        // Cara 1 - Pakai sworm
        const userModel = db.model({ table: UsersTable });
        const updatedUser = userModel({
            id: updateUser.id,
            username: updateUser.username,
            password: updateUser.password,
            email: updateUser.email
        });
        await updatedUser.update();
        return res.json({ status: true, data: updatedUser });
    } catch (err) {
        console.log(err);
        return res.json({ status: false, message: err.message })
    }
})



module.exports = router;