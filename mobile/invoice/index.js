const router = require('express').Router();
const oracledb = require('oracledb');
const getDbConfig = require('../../service/getDbConfig');
const config = getDbConfig(process.env.APP_ENV).config;
const verifyMobile = require('../../service/verifyMobile');

const InvoiceTable = process.env.INVOICE_TRX;
const InvoiceTypeTable = process.env.MS_INV_TYPE;

router.use(verifyMobile);

const statusQueryBuilder = (status) => {
    let query = '';
    switch (status) {
        case "NEW":
            query = `AND STATUS = 'NEW'`;
            break;
        case "APPROVED":
            query = `AND STATUS = 'APPROVED'`;
            break;
        case "UPDATED":
            query = `AND STATUS = 'UPDATED'`;
            break;
        case "REJECTED":
            query = `AND STATUS = 'REJECTED'`;
            break;
    }
    return query;
}

router.get('/:invoice_id', async (req, res) => {
    // Get all invoice
    const { invoice_id } = req.params;
    let connection;
    let results;
    let totalRows;
    let totalPage;
    try {
        connection = await oracledb.getConnection(config);
        results = await connection.execute(
            `SELECT inv.* FROM 
                ${InvoiceTable} inv,
                ${InvoiceTypeTable} invType
            WHERE 
                1=1
                AND inv.INVOICE_TYPE_ID = invType.ID
                AND inv.ID = :invoiceId
            `
            , [invoice_id]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { "SIGNATURE": { type: oracledb.STRING } } }
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
        let statusQuery = '';
        if (req.query.hasOwnProperty("status")) {
            statusQuery = statusQueryBuilder(req.query.status);
        }
        console.log(statusQuery);
        results = await connection.execute(
            `SELECT inv.ID, inv.AMOUNT, inv.DESCRIPTION, inv.STATUS, inv.INVOICE_TYPE_ID,invType.INV_TYPE_NAME FROM 
                ${InvoiceTable} inv,
                ${InvoiceTypeTable} invType
            WHERE 
                1=1
                AND inv.INVOICE_TYPE_ID = invType.ID
                AND invType.USER_PIC_ID = :userPicId
                ${statusQuery}
            ORDER BY inv.ID OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
            `
            , [user_id, offset, limit]
            , { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchInfo: { "SIGNATURE": { type: oracledb.STRING } } }
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
    if (!invoice_id && !signature) {
        return res.status(422).json({ message: "JSON has no invoice_id and signature attribute" });
    }
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
    if (!invoice_id && !signature) {
        return res.status(422).json({ message: "JSON has no invoice_id and signature attribute" });
    }
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