import express from 'express';
import { createWorker, getAllWorker, getWorkerById, createTransaction, getAllTransaction } from '../controller/workerController.js';

const workerRoutes = express.Router();
workerRoutes.post('/create', createWorker);
workerRoutes.get('/get-all-worker', getAllWorker);
workerRoutes.get('/get-worker-by-id/:id', getWorkerById);
workerRoutes.post('/create-transaction', createTransaction);
workerRoutes.get('/get-all-transaction', getAllTransaction);


export { workerRoutes };