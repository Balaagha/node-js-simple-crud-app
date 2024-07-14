import { mysqlPool } from "../config/db.js";
import Decimal from "decimal.js";

function parseRowData(data) {
    if (typeof data === 'string') {
        return JSON.parse(data);
    } else {
        return data
    }
}

const createCustomer = async(req, res) => {
    try {
        let { name, debt, createdTime } = req.body;
        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;

        let query = '';
        let queryParams = [];

        if (typeof debt === 'undefined' || debt === '') {
            query = 'INSERT INTO customers (name, createdTime) VALUES (?, ?)';
            queryParams = [name, createdTime];
        } else {
            query = 'INSERT INTO customers (name, debt, createdTime) VALUES (?, ?, ?)';
            queryParams = [name, debt, createdTime];
        }
        const [result] = await mysqlPool.query(query, queryParams);
        const id = result.insertId;
        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `user(${id}) record`,
                data: "success"
            });
        }
    } catch (e) {
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    }
}
const getAllCustomer = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM customers');
        const parsedRows = rows.map(row => ({
            ...row,
            data: row.data ? parseRowData(row.data) : null
        }));
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: false,
                message: "All user records",
                data: parsedRows,
            });
        }
    } catch (e) {
        return res.status(404).send({
            success: false,
            message: "no records found",
            data: e,
        });
    }
}
const getCustomerById = async(req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await mysqlPool.query(`SELECT * FROM customers WHERE id =${id}`);
        
        if (!rows) {
            return res.status(404).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `user(${id}) record`,
                data: {
                    ...rows[0],
                    data: rows[0].data ? parseRowData(rows[0].data) : null
                }
            });
        }
    } catch (e) {
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    }
}
const createCustomerTransaction = async(req, res) => {
    let connection;
    try {
        connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        let { customerId, transactionType, transactionDesc, createdTime, transactionAmount } = req.body;

        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;
        transactionDesc = (typeof transactionDesc === 'undefined') ? '' : transactionDesc;
        console.log("timestamp" + createdTime);

        // get selectedCustomer data
        const [customerData] = await mysqlPool.query(`SELECT * FROM customers WHERE id =${customerId}`);
        let updatedDebt = new Decimal(customerData[0].debt);

        // update customer updatedDebt by transactionType
        if (transactionType === '+') {
            updatedDebt = updatedDebt.plus(transactionAmount);
        } else if (transactionType === '-') {
            updatedDebt = updatedDebt.minus(transactionAmount);
        }
        updatedDebt = updatedDebt.toNumber();

        // update db for customer salary
        const [updateCustomerResult] = await connection.query('UPDATE customers SET debt = ? WHERE id = ?', [updatedDebt, customerId]);
        const [createTransactionResult] = await connection.query('INSERT INTO customersTransactions (createdTime, transactionAmount, transactionType, transactionDesc, customerId, customerName) VALUES (?, ?, ?, ?, ?, ?)', [createdTime, transactionAmount, transactionType, transactionDesc, customerId, customerData[0].name]);
        console.log("updateCustomerResult => " + updateCustomerResult);
        console.log("createTransactionResult => " + createTransactionResult);
        if (!createTransactionResult || !updateCustomerResult) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            await connection.commit();
            return res.status(200).send({
                success: true,
                message: `transaction successfully created`,
                data: "success"
            });
        }
    } catch (e) {
        connection.rollback();
        console.log(e);
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    } finally {
        if (connection) await connection.release();
    }
}
const getAllCustomerTransaction = async(req, res) => {
    try {
        // query all transactions
        let query = 'SELECT * FROM customersTransactions WHERE 1=1';
        const queryParams = [];

        if (req.query.selectedTime) {
            // selectedTime checkpoint
            query += ' AND DATE(FROM_UNIXTIME(createdTime / 1000)) = ?';
            queryParams.push(new Date(1709251262000).toISOString().split('T')[0]);
        } else if (req.query.fromTime && req.query.toTime) {
            // fromTime ve toTime checkpoint ( if dont have selectedTime)
            query += ' AND createdTime BETWEEN ? AND ?';
            queryParams.push(req.query.fromTime, req.query.toTime);
        }
        // customerId checkpoint
        if (req.query.customerId) {
            query += ' AND customerId = ?';
            queryParams.push(req.query.customerId);
        }
        query += ' ORDER BY createdTime DESC'

        // run query
        const [customerListResponse] = await mysqlPool.query('SELECT name, id FROM customers');
        const [transactionListResponse] = await mysqlPool.query(query, queryParams);

        if (!transactionListResponse && !customerListResponse) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            let total = new Decimal(0);

            transactionListResponse.forEach(row => {
                let transactionAmount = new Decimal(row.transactionAmount);

                if (row.transactionType === "+") {
                    total = total.plus(transactionAmount);
                } else if (row.transactionType === "-") {
                    total = total.minus(transactionAmount);
                }
            });
            total = total.toNumber();
            return res.status(200).send({
                success: true,
                message: "All user records",
                data: {
                    "transactionList": transactionListResponse,
                    "customerList": customerListResponse,
                    "total": total
                },
            });
        }
    } catch (e) {
        return res.status(404).send({
            success: false,
            message: "no records found",
            data: e,
        });
    }
}

export { createCustomer, getAllCustomer, getCustomerById, createCustomerTransaction, getAllCustomerTransaction };