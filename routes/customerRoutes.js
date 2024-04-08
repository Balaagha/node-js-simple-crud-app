import express from 'express';
import { createCustomer, getAllCustomer, getCustomerById, createCustomerTransaction, getAllCustomerTransaction } from '../controller/customerController.js';

const customerRoutes = express.Router();
customerRoutes.post('/create', createCustomer);
customerRoutes.get('/get-all-customer', getAllCustomer);
customerRoutes.get('/get-customer-by-id/:id', getCustomerById);
customerRoutes.post('/create-transaction', createCustomerTransaction);
customerRoutes.get('/get-all-transaction', getAllCustomerTransaction);


export { customerRoutes };