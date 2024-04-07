import express from 'express';
import { getAllUsers, getUserById, createUser, updateUserById, deleteUserById, checkPassword } from '../controller/userController.js';

const userRoutes = express.Router();

userRoutes.post('/check-password', checkPassword);
userRoutes.get('/getAll', getAllUsers);
userRoutes.get('/get/:id', getUserById);
userRoutes.post('/create', createUser);
userRoutes.put('/update/:id', updateUserById);
userRoutes.delete('/delete/:id', deleteUserById);

export { userRoutes };