const router = require('express').Router();
const oracledb = require('oracledb');
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV).config;
const verifyMobile = require('../../service/verifyMobile');

const InvoiceTable = process.env.INVOICE_TRX;
const InvoiceTypeTable = process.env.MS_INV_TYPE;

router.use(verifyMobile);

router.get('/user/:user_id', async (req, res) => {
    // Get all invoice
    const { user_id } = req.params;
    let connection;
    let results;
    let totalRows;
    let totalPage;
    try {
        connection = await oracledb.getConnection(config);
        // Define pagination maxPage
        const countResults = await connection.execute(`SELECT COUNT(1) as count FROM ${InvoiceTable}`, {}, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        totalRows = countResults.rows[0].COUNT;
        // Pagination
        let page = 0;
        if (req.query.hasOwnProperty("page")) {
            page = Number(req.query.page);
        }
        const limit = Number(process.env.PAGE_LIMIT);
        const offset = Number(page) * Number(limit);
        totalPage = Math.ceil(totalRows / limit);
        if (page > totalPage) {
            throw new Error(`The maximum page is: ${totalPage}, the requested page: ${page} is not available!`);
        }
        results = await connection.execute(
            `SELECT * FROM 
                ${InvoiceTable} inv,
                ${InvoiceTypeTable} invType
            WHERE 
                1=1
                AND inv.INVOICE_TYPE_ID = invType.ID
                AND invType.USER_PIC_ID = :userPicId
                AND STATUS = 'NEW'
            ORDER BY inv.ID OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
            `
            , [user_id, limit, offset]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT }
        )
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message || "Error while querying data from database" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Error while closing database connection" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results.rows, totalPage, totalRows });
        }
    }
})

router.post('/approve', async (req, res) => {
    const { invoice_id, signature } = req.body;
    const { USERNAME: apvBy } = req.user;
    const todayDt = new Date();
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config);
        results = await connection.execute(
            `UPDATE ${InvoiceTable} 
            SET 
                SIGNATURE = :signature, 
                STATUS = :status,
                APPROVED_BY = :apvBy,
                APPROVED_DATE = :apvDt 
            WHERE ID =: id`
            , { signature, status: "APPROVED", apvBy, apvDt: todayDt, id: invoice_id }
            , { autoCommit: true }
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message || "Error while updating data to database" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing database connection" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results });
        }
    }
})

router.post('/reject', async (req, res) => {
    const { invoice_id, signature } = req.body;
    const { USERNAME: updBy } = req.user;
    const todayDt = new Date();
    let connection;
    let results;
    try {
        connection = await oracledb.getConnection(config);
        results = await connection.execute(
            `UPDATE ${InvoiceTable} 
            SET 
                SIGNATURE = :signature, 
                STATUS = :status,
                UPDATED_BY = :updBy,
                UPDATED_DATE = :updDt 
            WHERE ID =: id`
            , { signature, status: "REJECTED", updBy, updDt: todayDt, id: invoice_id }
            , { autoCommit: true }
        );
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: err.message || "Error while updating data to database" });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Internal error while closing database connection" });
            }
        }
        if (results) {
            return res.json({ status: true, data: results });
        }
    }
})

module.exports = router;