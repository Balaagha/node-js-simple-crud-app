import { mysqlPool } from "../config/db.js";

const createWorker = async(req, res) => {
    try {
        let { name, salaryDebt, createdTime } = req.body;
        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;
        console.log("timestamp" + createdTime);

        let query = '';
        let queryParams = [];

        if (typeof salaryDebt === 'undefined' || salaryDebt === '') {
            query = 'INSERT INTO workers (name, createdTime) VALUES (?, ?)';
            queryParams = [name, createdTime];
        } else {
            query = 'INSERT INTO workers (name, salaryDebt, createdTime) VALUES (?, ?, ?)';
            queryParams = [name, salaryDebt, createdTime];
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
const getAllWorker = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM workers');
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: false,
                message: "All user records",
                data: rows,
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
const getWorkerById = async(req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await mysqlPool.query(`SELECT * FROM workers WHERE id =${id}`);
        if (!rows) {
            return res.status(404).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `user(${id}) record`,
                data: rows[0],
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
const createTransaction = async(req, res) => {
    let connection;
    try {
        connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        let { workerId, transactionType, transactionDesc, createdTime, transactionAmount } = req.body;

        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;
        transactionDesc = (typeof transactionDesc === 'undefined') ? '' : transactionDesc;
        console.log("timestamp" + createdTime);

        // get selectedWorker data
        const [workerData] = await mysqlPool.query(`SELECT * FROM workers WHERE id =${workerId}`);
        let updatedSalary = parseFloat(workerData[0].salaryDebt);

        // update worker updatedSalary by transactionType
        if (transactionType === '+') {
            updatedSalary = workerData[0].salaryDebt + parseFloat(transactionAmount)
        } else if (transactionType === '-') {
            updatedSalary = workerData[0].salaryDebt - parseFloat(transactionAmount)
        }

        // update db for worker salary
        const [updateWorkerResult] = await connection.query('UPDATE workers SET salaryDebt = ? WHERE id = ?', [updatedSalary, workerId]);
        const [createTransactionResult] = await connection.query('INSERT INTO workersTransactions (createdTime, transactionAmount, transactionType, transactionDesc, workerId, workerName) VALUES (?, ?, ?, ?, ?, ?)', [createdTime, transactionAmount, transactionType, transactionDesc, workerId, workerData[0].name]);
        console.log("updateWorkerResult => " + updateWorkerResult);
        console.log("createTransactionResult => " + createTransactionResult);
        if (!createTransactionResult || !updateWorkerResult) {
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
const getAllTransaction = async(req, res) => {
    try {
        // query all transactions
        let query = 'SELECT * FROM workersTransactions WHERE 1=1';
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
        // workerId checkpoint
        if (req.query.workerId) {
            query += ' AND workerId = ?';
            queryParams.push(req.query.workerId);
        }

        // run query
        const [workerListResponse] = await mysqlPool.query('SELECT name, id FROM workers');
        const [transactionListResponse] = await mysqlPool.query(query, queryParams);

        if (!transactionListResponse && !workerListResponse) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            let total = 0;
            transactionListResponse.forEach(row => {
                if (row.transactionType === "+") {
                    total += row.transactionAmount;
                } else if (row.transactionType === "-") {
                    total -= row.transactionAmount;
                }
            });
            return res.status(200).send({
                success: true,
                message: "All user records",
                data: {
                    "transactionList": transactionListResponse,
                    "workerList": workerListResponse,
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

export { createWorker, getAllWorker, getWorkerById, createTransaction, getAllTransaction };