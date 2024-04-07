import { mysqlPool } from "../config/db.js";
import momentTimezone from 'moment-timezone';

// Get all users
const getAllUsers = async(req, res) => {
    const timestamp = Date.now();
    console.log("timestamp => " + timestamp);
    const date = new Date(timestamp);
    console.log("date =>" + date); // Çıktı: 2021-04-05T12:10:00.000Z
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM users');
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

const getUserById = async(req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await mysqlPool.query(`SELECT * FROM users WHERE id =${id}`);
        if (!rows) {
            return res.status(404).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `user(${id}) record`,
                data: rows,
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

const createUser = async(req, res) => {
    try {
        const timestamp = momentTimezone().format('YYYY-MM-DD HH:mm:ss');
        console.log("timestamp" + timestamp);

        const { name } = req.body;
        const currentTime = new Date();
        const mysqlDateTime = currentTime.toISOString().slice(0, 19).replace('T', ' ');
        console.log(mysqlDateTime);


        const [result] = await mysqlPool.query('INSERT INTO users (name, created_time) VALUES (?,?)', [name, mysqlDateTime]);
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


const updateUserById = async(req, res) => {
    try {
        const id = req.params.id;
        const { name } = req.body;
        const [result] = await mysqlPool.query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected user(${id}) is updated successfully`,
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

const deleteUserById = async(req, res) => {
    try {
        const id = req.params.id;
        const [result] = await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected user(${id}) is deleted successfully`,
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

const checkPassword = async(req, res) => {
    try {
        const { password } = req.body;
        if (password === "0235") {
            return res.status(200).send({
                success: true,
                message: `Succsess login`,
                data: {
                    isSuccess: true,
                }
            });
        } else {
            return res.status(200).send({
                success: false,
                message: `Fail login`,
                data: {
                    isSuccess: false,
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


export { getAllUsers, getUserById, createUser, updateUserById, deleteUserById, checkPassword };