const router = require('express').Router();
const oracledb = require('oracledb');
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV);
const verifyToken = require('../../service/verifyToken');
const { sendNotification } = require('../../service/PushNotification');
const Redis = require('redis');

const InvoiceTable = process.env.INVOICE_TRX;
const InvoiceTypeTable = process.env.MS_INV_TYPE;

router.use(verifyToken);

const notify = async (invTypeId, conn) => {
    try {
        const results = await conn.execute(
            `SELECT * FROM ${InvoiceTypeTable} WHERE ID = :id`
            , [invTypeId]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const redisClient = Redis.createClient({
            url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
        });
        await redisClient.connect();
        const fcmToken = await redisClient.get(`user-fcm:${results.rows[0].USER_PIC_ID}`);
        console.log('TOKEN: ' + fcmToken);
        await redisClient.disconnect();
        if (fcmToken) {
            await sendNotification(
                "c32Na2MAQX-AB0OCNxrFvO:APA91bFYLa1FhF6cnlAGEbF3NcJg4uEDFbj6v6abHEVSh5Gtfj6MZ5oLa3L2CjYxl5JfdCcy9bmQ4tO8PIy6QxiNrVIGs6xZ1LqU7R3GKsyQUpgjAdsR0KUSuVKEZI-K9DnP-EJZjiw4",
                {
                    notification: {
                        title: 'Gudang Garam Invoice Approval',
                        body: '1 Invoice baru untuk diapprove!'
                    }
                }
            )
        }
    } catch (err) {
        console.error(err);
    }
}

router.get('/all', async (req, res) => {
    let connection;
    let results;
    let totalPage;
    let countData;
    try {
        connection = await oracledb.getConnection(config.config);
        // Define pagination maxPage
        const countResults = await connection.execute(`SELECT COUNT(1) as count FROM ${InvoiceTable}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        // console.log(countResults.rows[0].COUNT);
        countData = countResults.rows[0].COUNT;
        // Pagination
        let page = 0;
        if (req.query.hasOwnProperty("page")) {
            page = Number(req.query.page);
        }
        const limit = Number(process.env.PAGE_LIMIT);
        const offset = Number(page) * Number(limit);
        totalPage = Math.ceil(countResults.rows[0].COUNT / limit);
        results = await connection.execute(
            `SELECT * FROM ${InvoiceTable} ORDER BY ID OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`
            , [offset, limit]
            , {
                outFormat: oracledb.OUT_FORMAT_OBJECT,
                fetchInfo: { "SIGNATURE": { type: oracledb.STRING } }
            }
        )
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err.message || "Internal error while sending notification" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Error while closing database connection!" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results.rows, totalPage, totalRows: countData })
        }
    }
})

router.get('/:id', async (req, res) => {
    const { id } = req.params;
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config.config);
        results = await connection.execute(
            `SELECT * FROM ${InvoiceTable} WHERE ID=:id`
            , [id]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
        console.log(results);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Error while closing database connection!" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results.rows });
        }
    }
})

router.get('/user/:user_id', async (req, res) => {
    const { user_id } = req.params;
    let connection;
    let results;
    let totalPage;
    let totalRows;
    try {
        connection = await oracledb.getConnection(config.config);
        // Define pagination maxPage
        const countResults = await connection.execute(`SELECT COUNT(1) as count FROM ${InvoiceTable}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log(countResults.rows[0].COUNT);
        totalRows = countResults.rows[0].COUNT;
        // Pagination
        let page = 0;
        if (req.query.hasOwnProperty("page")) {
            page = Number(req.query.page);
        }
        const limit = Number(process.env.PAGE_LIMIT);
        const offset = Number(page) * Number(limit);
        totalPage = Math.ceil(totalRows / limit);

        results = await connection.execute(
            `SELECT inv.* FROM 
                ${InvoiceTable} inv,
                ${InvoiceTypeTable} invType 
            WHERE 
                1=1
                AND inv.INVOICE_TYPE_ID = invType.ID
                AND USER_PIC_ID = :userPicId
                AND STATUS = 'NEW'
            ORDER BY inv.ID OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`
            , [user_id, offset, limit]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
    } catch (err) {
        console.log(err);
        return res.status(500).json({ status: false, message: err.message || "Error while querying to database" })
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Error while closing database connection!" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results.rows, totalPage, totalRows });
        }
    }
})

router.post('/create', async (req, res) => {
    const { amount = 0, description, invoice_type_id: invTypeId } = req.body;
    const { USERNAME: crtBy } = req.user;
    const todayDt = new Date();
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config.config);
        results = await connection.execute(
            `INSERT INTO ${InvoiceTable} (AMOUNT, DESCRIPTION, STATUS, INVOICE_TYPE_ID, CREATED_BY, CREATED_DATE) VALUES (:amount, :description, :status, :invTypeId, :createBy, :createDt)
             RETURNING id, ROWID INTO :ids, :rids`
            , {
                amount, description, status: "NEW", invTypeId, createBy: crtBy, createDt: todayDt, ids: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }, rids: { type: oracledb.STRING, dir: oracledb.BIND_OUT }
            }
            , { autoCommit: true }
        )
        console.log(results.outBinds.ids[0]);
        // Kirim notif ke userPicId di invTypeId
        await notify(invTypeId, connection);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Internal error while inserting data into database" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing connection from database" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results });
        }
    }
})

router.post('/approve', async (req, res) => {
    const { id, signature } = req.body;
    const todayDt = new Date();
    const { USERNAME: apvBy } = req.user;
    let connection;
    let results;
    if (!id && !signature) {
        return res.status(422).json({ message: "JSON has no id and signature attribute" });
    }
    try {
        connection = await oracledb.getConnection(config.config);
        results = await connection.execute(
            `UPDATE ${InvoiceTable} SET STATUS = :stat, SIGNATURE = :signature,APPROVED_BY = :apvBy, APPROVED_DATE = :apvDt WHERE ID=:id`
            , { id, stat: "APPROVED", signature, apvBy: apvBy, apvDt: todayDt }
            , { autoCommit: true }
        )
        console.log(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: `Internal error while updating data on table ${InvoiceTable}` });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing connection from database" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results })
        }
    }
})

router.post('/reject', async (req, res) => {
    const { id } = req.body;
    const todayDt = new Date();
    const { USERNAME: updBy } = req.user;
    let connection;
    let results;
    if (!id && !signature) {
        return res.status(422).json({ message: "JSON has no id and signature attribute" });
    }
    try {
        connection = await oracledb.getConnection(config.config);
        results = await connection.execute(
            `UPDATE ${InvoiceTable} SET STATUS = :stat,UPDATED_BY = :updBy, UPDATED_DATE = :updDt WHERE ID=:id`
            , { id: id, stat: "REJECTED", updBy: updBy, updDt: todayDt }
            , { autoCommit: true }
        )
        console.log(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: `Internal error while updating data on table ${InvoiceTable}` });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing connection from database" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results })
        }
    }
})

router.patch('/update', async (req, res) => {
    const { id, amount = 0, description } = req.body;
    const { USERNAME: updBy } = req.user;
    const todayDt = new Date();

    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config.config);
        results = await connection.execute(
            `UPDATE ${InvoiceTable} SET AMOUNT  = :amt, DESCRIPTION = :desc, STATUS = :status, UPDATED_BY = :updBy, UPDATED_DATE = :updDt WHERE ID = :id`
            , { id: id, amt: amount, desc: description, status: "UPDATED", updBy: updBy, updDt: todayDt }
            , { autoCommit: true }
        )
        console.log(results);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message || "Internal erroro while inserting data to database" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing connection from database" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results });
        }
    }
})

module.exports = router;