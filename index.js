require('dotenv').config();

const PORT = process.env.PORT;
const express = require('express');
const app = express();



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