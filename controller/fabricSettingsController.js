import { mysqlPool } from "../config/db.js";
import Decimal from "decimal.js";

const createWorkType = async(req, res) => {
    try {
        let { name, workingPrice, sellingPrice } = req.body;
        workingPrice = (typeof workingPrice === 'undefined' || workingPrice === '') ? 0 : workingPrice;
        sellingPrice = (typeof sellingPrice === 'undefined' || sellingPrice === '') ? 0 : sellingPrice;

        if (workingPrice == 0) {
            return res.status(500).send({
                success: false,
                message: `Unknwon parametr`,
            });
        }

        const [result] = await mysqlPool.query('INSERT INTO workType (name, workingPrice, sellingPrice ) VALUES (?, ?, ?)', [name, workingPrice, sellingPrice]);
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
const getAllWorkerType = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM workType');
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: true,
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
const updateWorkType = async(req, res) => {
    try {
        let { id, name, workingPrice, sellingPrice } = req.body;
        workingPrice = (typeof workingPrice === 'undefined' || workingPrice === '') ? 0 : workingPrice;
        sellingPrice = (typeof sellingPrice === 'undefined' || sellingPrice === '') ? 0 : sellingPrice;

        if (workingPrice == 0) {
            return res.status(500).send({
                success: false,
                message: `Unknwon parametr`,
            });
        }
        let query = 'UPDATE workType SET name = ?, workingPrice = ?, sellingPrice = ?  WHERE id = ?';
        const queryParams = [name, workingPrice, sellingPrice, id];
        const [result] = await mysqlPool.query(query, queryParams);
        if (!result) {

            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected sintifon(${id}) is updated successfully`,
            });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    }
}

const createSintifon = async(req, res) => {
    try {
        let { name, count } = req.body;
        count = (typeof count === 'undefined' || count === '') ? 0 : count;

        const [result] = await mysqlPool.query('INSERT INTO sintifon (name, count) VALUES (?, ?)', [name, count]);
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
const getAllSintifon = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM sintifon');
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: true,
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
const updateSintifon = async(req, res) => {
    try {
        const { id, name, count, chanchedCount, transactionType } = req.body;
        let query = 'UPDATE sintifon SET ';
        const queryParams = [];

        if (typeof chanchedCount !== 'undefined' && typeof chanchedCount !== "" && typeof transactionType !== 'undefined' && typeof transactionType !== "") {

            const [selectedSintifonData] = await mysqlPool.query(`SELECT * FROM sintifon WHERE id =${id}`);
            let updatedCount = new Decimal(selectedSintifonData[0].count);

            if (transactionType === '+') {
                updatedCount = updatedCount.plus(new Decimal(chanchedCount));
            } else if (transactionType === '-') {
                updatedCount = updatedCount.minus(new Decimal(chanchedCount));
            }
            query += 'count = ?';
            queryParams.push(updatedCount.toNumber());
        } else {
            if (typeof name !== 'undefined' && name !== "" && typeof count !== 'undefined' && count !== "") {
                console.log('count => ' + count);
                query += 'name = ?, count = ?';
                queryParams.push(name, count);
            } else if (typeof name !== 'undefined' && name !== "") {
                query += 'name = ?';
                queryParams.push(name);
            } else if (typeof count !== 'undefined' && count !== "") {
                query += 'count = ?';
                queryParams.push(count);
            } else {
                return res.status(400).send({
                    success: false,
                    message: 'No valid parameters provided for update.',
                });
            }
        }



        queryParams.push(id);
        query += ' WHERE id = ?';


        const [result] = await mysqlPool.query(query, queryParams);

        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected sintifon(${id}) is updated successfully`,
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

export { createSintifon, getAllSintifon, updateSintifon, createWorkType, getAllWorkerType, updateWorkType };