require('dotenv').config();

const PORT = process.env.PORT;
const DB_NAME = process.env.DB_NAME;
const DB_USER_NAME = process.env.DB_USER_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST_NAME = process.env.DB_HOST_NAME;

const express = require('express');
const app = express();
const mysql = require('mysql');

const connection = mysql.createConnection({
    host: DB_HOST_NAME,
    user: DB_USER_NAME,
    password: DB_PASSWORD,
    database: DB_NAME
});

// Veritabanına bağlan
connection.connect(error => {
    if (error) throw error;
    console.log("Veritabanına başarıyla bağlandı.");
});

// Kullanıcıları listele
app.get('/users', (req, res) => {
    connection.query('SELECT * FROM users', (error, results) => {
        if (error) throw error;
        res.send(results);
    });
});

app.get('/', (req, res) => {
    res.status(200).json({
        msg: "Working!"
    });
});

app.get('/login', (req, res) => {
    res.status(200).json({
        msg: "Login user!"
    });
});

app.get('/register', (req, res) => {
    res.status(200).json({
        msg: "Register user!"
    });
});

app.listen(PORT, () => {
    console.log(`backend running on ${PORT}`);
});