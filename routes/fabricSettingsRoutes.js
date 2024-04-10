import express from 'express';
import { createSintifon, getAllSintifon, updateSintifon, createWorkType, getAllWorkerType, updateWorkType, getMakeProductPageData } from '../controller/fabricSettingsController.js';

const fabricSettingsRoutes = express.Router();
fabricSettingsRoutes.post('/create-sintifon', createSintifon);
fabricSettingsRoutes.get('/get-all-sintifon', getAllSintifon);
fabricSettingsRoutes.put('/update-sintifon', updateSintifon);

fabricSettingsRoutes.get('/get-all-worktype', getAllWorkerType);
fabricSettingsRoutes.post('/create-worktype', createWorkType);
fabricSettingsRoutes.put('/update-worktype', updateWorkType);

fabricSettingsRoutes.get('/get-make-product-page-data', getMakeProductPageData);

export { fabricSettingsRoutes };