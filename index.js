import dotenv from 'dotenv';
import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import { userRoutes } from './routes/userRoutes.js';
import { workerRoutes } from './routes/workerRoutes.js';
import { customerRoutes } from './routes/customerRoutes.js';

const PORT = process.env.PORT;

const app = express();
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/user/v1', userRoutes);
app.use('/api/worker/v1', workerRoutes);
app.use('/api/customer/v1', customerRoutes);

app.get('/', (req, res) => {
    res.status(200).json({
        msg: "Working!"
    });
});

// Error logging
app.use((err, req, res, next) => {
    console.error(err.stack); // Hata mesajını konsola yazdır
    res.status(err.status || 500);
    res.json({
        error: {
            mesaj: err.message || 'error happening in server.'
        }
    });
});

app.listen(PORT, () => {
    console.log(`backend running on ${PORT}`.bgMagenta.white);
});