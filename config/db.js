import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const DB_NAME = process.env.DB_NAME;
const DB_USER_NAME = process.env.DB_USER_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST_NAME = process.env.DB_HOST_NAME;

const mysqlPool = mysql.createPool({
    connectionLimit: 1000,
    host: DB_HOST_NAME,
    user: DB_USER_NAME,
    password: DB_PASSWORD,
    database: DB_NAME
});

mysqlPool.getConnection(
    error => {
        if (error) throw error;
        console.log("Veritabanına başarıyla bağlandı.");
    }
);

// export default pool;
export { mysqlPool };