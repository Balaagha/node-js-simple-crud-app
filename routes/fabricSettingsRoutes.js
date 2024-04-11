import express from 'express';
import { createSintifon, getAllSintifon, updateSintifon, createWorkType, getAllWorkerType, updateWorkType, getMakeProductPageData, makeProduct, getAllProducts, makeSale, getAllSales, getSaleById } from '../controller/fabricSettingsController.js';

const fabricSettingsRoutes = express.Router();
fabricSettingsRoutes.post('/create-sintifon', createSintifon);
fabricSettingsRoutes.get('/get-all-sintifon', getAllSintifon);
fabricSettingsRoutes.put('/update-sintifon', updateSintifon);

fabricSettingsRoutes.get('/get-all-worktype', getAllWorkerType);
fabricSettingsRoutes.post('/create-worktype', createWorkType);
fabricSettingsRoutes.put('/update-worktype', updateWorkType);

fabricSettingsRoutes.get('/get-make-product-page-data', getMakeProductPageData);
fabricSettingsRoutes.post('/make-product', makeProduct);
fabricSettingsRoutes.get('/get-all-products', getAllProducts);

fabricSettingsRoutes.post('/make-sale', makeSale);
fabricSettingsRoutes.get('/get-all-sales', getAllSales);
fabricSettingsRoutes.get('/get-sale-by-id/:id', getSaleById);


export { fabricSettingsRoutes };