import { mysqlPool } from "../config/db.js";
import Decimal from "decimal.js";

function divideAndRound(value, divisor, decimalPlaces) {
    const result = new Decimal(value).dividedBy(divisor);
    return Number(result.toFixed(decimalPlaces));
}

function multiplyAndRound(value, multiplier, decimalPlaces) {
    const result = new Decimal(value).times(multiplier);
    return Number(result.toFixed(decimalPlaces));
}

const makeProduct = async(req, res) => {
    let connection;
    try {
        connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        let { workingTypeId, sintifonTypeId, customerId, products, createdTime } = req.body;

        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;

        // fetch worktypes data
        let [selectedWorkTypeData] = await mysqlPool.query(`SELECT * FROM workType WHERE id =${workingTypeId}`);
        let [allWorkTypeData] = await mysqlPool.query(`SELECT * FROM workType`);
        selectedWorkTypeData = selectedWorkTypeData[0];
        // fetch customer data
        let [selectedCustomerData] = await mysqlPool.query(`SELECT * FROM customers WHERE id =${customerId}`);
        selectedCustomerData = selectedCustomerData[0];
        // fetch  polyester data
        let [selectedPolyesterData] = await mysqlPool.query(`SELECT * FROM sintifon WHERE id =${sintifonTypeId}`);
        selectedPolyesterData = selectedPolyesterData[0];


        let productObject = {}
        productObject.totalCount = new Decimal(0);
        productObject.caculatedCountList = "";
        productObject.selectedWorkTypeName = selectedWorkTypeData.name;
        productObject.selectedPolyesterName = selectedPolyesterData.name;
        productObject.selectedCustomerName = selectedCustomerData.name;
        products.forEach(product => {
            productObject.totalCount = productObject.totalCount.plus(product.productCount);
            if (productObject.caculatedCountList == "") {
                productObject.caculatedCountList += product.productCount;
            } else {
                productObject.caculatedCountList += `, ${product.productCount}`;
            }
        });

        // update polyester data
        selectedPolyesterData.count = new Decimal(selectedPolyesterData.count).minus(productObject.totalCount.toNumber()).toNumber();
        let [updatePolyesterResponse] = await connection.query('UPDATE sintifon SET count = ? WHERE id = ?', [selectedPolyesterData.count, selectedPolyesterData.id]);
        if (!updatePolyesterResponse) {
            return genericErrorHandler(res);
        }

        // fetch and update all workers data
        const releatingWorkersIds = calculateWorkerProductCounts(products, selectedWorkTypeData.workingPrice); // return { workerId: 1, count: 100 } in array

        for (const workObj of releatingWorkersIds) {
            const [workerSqlData] = await mysqlPool.query(`SELECT * FROM workers WHERE id =${workObj.workerId}`);

            let transactionDesc = "| ";
            let totalCount = 0;
            let currentSalary = 0;
            let totalSalary = 0;

            workObj.workerData.forEach(work => {
                const salary = multiplyAndRound(work.count, work.workingPrice, 2);
                totalCount += work.count;
                transactionDesc += `${work.count}м( ${work.workingPrice}₽) + `;
                currentSalary += salary;
            })

            totalSalary = (new Decimal(workerSqlData[0].salaryDebt).plus(currentSalary)).toNumber();
            transactionDesc = transactionDesc.slice(0, -2);
            transactionDesc += " | "

            transactionDesc += `Зарплата ${currentSalary}₽ была добавлена для ${totalCount} метров работы. | общая зарплата: ${totalSalary}₽ | Клиент:  ${selectedCustomerData.name} |`;

            // update db for worker salary
            const [updateWorkerResult] = await connection.query('UPDATE workers SET salaryDebt = ? WHERE id = ?', [totalSalary, workObj.workerId]);
            const [createTransactionResult] = await connection.query('INSERT INTO workersTransactions (createdTime, transactionAmount, transactionType, transactionDesc, workerId, workerName) VALUES (?, ?, ?, ?, ?, ?)', [createdTime, currentSalary, "+", transactionDesc, workObj.workerId, workerSqlData[0].name]);
            if (!updateWorkerResult || !createTransactionResult) {
                return genericErrorHandler(res);
            }
        }

        await updateCustomerData(connection, customerId, workingTypeId, selectedCustomerData, allWorkTypeData, productObject, "makeProduct");

        productObject.totalCount = productObject.totalCount.toNumber();
        const [result] = await connection.query('INSERT INTO productGroup (customerId, workingTypeId, sintifonTypeId, totalCount, data, createdTime ) VALUES (?, ?, ?, ?, ?, ?)', [customerId, workingTypeId, sintifonTypeId, productObject.totalCount, JSON.stringify(productObject), createdTime]);
        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            await connection.commit();
            console.log("connection.commit() after");
            return res.status(200).send({
                success: true,
                message: `work successfully created`,
                data: "success"
            });
        }
    } catch (e) {
        connection.rollback();
        console.log(e);
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    } finally {
        if (connection) await connection.release();
    }
}

async function updateCustomerData(connection, customerId, workingTypeId, selectedCustomerData, allWorkTypeData, productObject, flowType, salePrice) {
    // update making product count in selected customer data
    console.dir("__________________________________________________________________start_______________________________________________________________________________________");
    console.dir("customerId: " + customerId);
    console.dir("workingTypeId: " + workingTypeId);
    console.dir("flowType: " + flowType);
    console.dir("salePrice: " + salePrice);

    console.dir("selectedCustomerData: ");
    console.dir(selectedCustomerData);
    console.dir("allWorkTypeData: ");
    console.dir(allWorkTypeData);
    productObject.caculatedCountListArray = productObject.caculatedCountList.split(', ');
    console.dir("productObject.caculatedCountListArray: ");
    console.dir(productObject.caculatedCountListArray);

    console.dir("___________________________________________________________________end________________________________________________________________________________________");

    let selectedCustomerDataField = [];
    if (selectedCustomerData.data) {
        if (typeof selectedCustomerData.data === 'string') {
            selectedCustomerDataField = JSON.parse(selectedCustomerData.data);
        } else {
            selectedCustomerDataField = selectedCustomerData.data;
        }
    }
    const updatedDataForselectedCustomerDataField = allWorkTypeData.map(workType => {
        const existingWorkType = selectedCustomerDataField.find(wt => wt.workTypeId === workType.id);


        if (workType.id === workingTypeId) {
            // Eğer bu çalışma tipi güncellenmek isteniyorsa
            let updatedTotalCount = 0;
            let workTypeCountList = existingWorkType?.workTypeCountList ?? [];

            console.dir("existingWorkType: ");
            console.dir(existingWorkType);
            console.dir("workTypeCountList: ");
            console.dir(workTypeCountList);

            if (flowType == "makeProduct") {

                updatedTotalCount = existingWorkType ?
                    (new Decimal((existingWorkType.workTypeTotalCount || 0)).plus(productObject.totalCount)).toNumber() : productObject.totalCount.toNumber();
                workTypeCountList = workTypeCountList.concat(productObject.caculatedCountListArray);
            } else if (flowType == "saleProduct") {
                updatedTotalCount = existingWorkType ?
                    (new Decimal((existingWorkType.workTypeTotalCount || 0)).minus(productObject.totalCount)).toNumber() : (new Decimal(0).minus(productObject.totalCount)).toNumber();
                productObject.caculatedCountListArray.forEach(element => {
                    if (workTypeCountList) {
                        const index = workTypeCountList.indexOf(element);
                        if (index !== -1) {
                            workTypeCountList.splice(index, 1); // Eşleşen elemanı workTypeCountList dizisinden çıkar
                        }
                    }

                });
            } else {
                updatedTotalCount = existingWorkType ? existingWorkType.workTypeTotalCount : 0;
            }
            return {
                workTypeId: workType.id,
                workTypeName: workType.name,
                workTypeTotalCount: updatedTotalCount,
                workTypeCountList: workTypeCountList,
                salePrice: salePrice ? salePrice : (existingWorkType ? existingWorkType.salePrice : 0)
            };
        }

        if (existingWorkType) {
            return existingWorkType; // Mevcut kaydı döndür
        }

        // Eğer müşteri datasında bu workType yoksa, null değerleri ile yeni bir kayıt oluştur
        return {
            workTypeId: workType.id,
            workTypeName: workType.name,
            workTypeCountList: null,
            workTypeTotalCount: null,
            salePrice: null
        };
    });

    await connection.query('UPDATE customers SET data = ? WHERE id = ?', [JSON.stringify(updatedDataForselectedCustomerDataField), customerId]);
}

function calculateWorkerProductCounts(products, workingPrice) {

    const workerDataMap = new Map();

    products.forEach(product => {
        const roundedPrice = divideAndRound(workingPrice, product.workersIds.length, 2);
        console.log("typeof roundedPrice: " + typeof roundedPrice);
        console.log("typeof product.workersIds.length: " + typeof product.workersIds.length);
        console.log("typeof workingPrice: " + typeof workingPrice);

        product.workersIds.forEach(workerId => {
            var workerData = {
                workerId: workerId,
                count: product.productCount,
                workingPrice: roundedPrice
            }
            if (workerDataMap.has(workerId)) {
                workerDataMap.get(workerId).push(workerData);
            } else {
                workerDataMap.set(workerId, [workerData]);
            }
        });
    });
    // Map'i istenen formata dönüştür
    const result = Array.from(workerDataMap, ([workerId, workerData]) => ({
        workerId,
        workerData
    }));
    return result;
}

const getMakeProductPageData = async(req, res) => {
    try {
        // run query
        const [workerResponse] = await mysqlPool.query('SELECT * FROM workers');
        const [workerTypesResponse] = await mysqlPool.query('SELECT * FROM workType');
        const [polyesterTypesResponse] = await mysqlPool.query('SELECT * FROM sintifon');
        const [customerResponse] = await mysqlPool.query('SELECT * FROM customers');
        const parsedcustomerResponse = customerResponse.map(row => ({
            ...row,
            data: row.data ? parseRowData(row.data) : null
        }));

        if (!workerResponse && !workerTypesResponse && !polyesterTypesResponse && !customerResponse) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db query",
            });
        } else {
            return res.status(200).send({
                success: true,
                message: "All user records",
                data: {
                    "customerResponse": parsedcustomerResponse,
                    "workerResponse": workerResponse,
                    "workerTypesResponse": workerTypesResponse,
                    "polyesterTypesResponse": polyesterTypesResponse
                },
            });
        }
    } catch (e) {
        console.dir(e);
        return res.status(404).send({
            success: false,
            message: "no records found",
            data: e,
        });
    }
}

function parseRowData(data) {
    if (typeof data === 'string') {
        return JSON.parse(data);
    } else {
        return data
    }
}

const getAllProducts = async(req, res) => {
    try {
        const queryParams = [];
        let query = 'SELECT * FROM productGroup WHERE 1=1';
        if (req.query.fromTime && req.query.toTime) {
            query += ' AND createdTime BETWEEN ? AND ?';
            queryParams.push(req.query.fromTime, req.query.toTime);
        }
        if (req.query.customerId) {
            query += ' AND customerId = ?';
            queryParams.push(req.query.customerId);
        }
        query += ' ORDER BY createdTime DESC'

        const [customerListResponse] = await mysqlPool.query('SELECT name, id FROM customers');
        const [rows] = await mysqlPool.query(query, queryParams);
        if (!rows || !customerListResponse) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            const parsedRows = rows.map(row => ({
                ...row,
                data: row.data ? parseRowData(row.data) : null
            }));
            return res.status(200).send({
                success: true,
                message: "All user records",
                data: {
                    "products": parsedRows,
                    "customerList": customerListResponse,
                },
            });
        }
    } catch (e) {
        return res.status(404).send({
            success: false,
            message: "no records found",
            data: e,
        });
    }
};

const makeSale = async(req, res) => {
    let connection;
    try {
        connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        let { workingTypeId, sintifonTypeId, customerIdTo, customerIdFrom, salePrice, products, createdTime, describtion } = req.body;

        createdTime = (typeof createdTime === 'undefined' || createdTime === '') ? Date.now() : createdTime;

        // fetch  polyester data
        let [selectedPolyesterData] = await mysqlPool.query(`SELECT * FROM sintifon WHERE id =${sintifonTypeId}`);
        selectedPolyesterData = selectedPolyesterData[0];

        // fetch worktypes data
        let [selectedWorkTypeData] = await mysqlPool.query(`SELECT * FROM workType WHERE id =${workingTypeId}`);
        let [allWorkTypeData] = await mysqlPool.query(`SELECT * FROM workType`);
        selectedWorkTypeData = selectedWorkTypeData[0];

        // map product data
        let productObject = {}
        productObject.totalCount = new Decimal(0);
        productObject.caculatedCountList = "";
        productObject.selectedWorkTypeName = selectedWorkTypeData.name;
        productObject.selectedPolyesterName = selectedPolyesterData.name;
        productObject.describtion = describtion;
        products.forEach(product => {
            productObject.totalCount = productObject.totalCount.plus(product.productCount);
            if (productObject.caculatedCountList == "") {
                productObject.caculatedCountList += product.productCount;
            } else {
                productObject.caculatedCountList += `, ${product.productCount}`;
            }
        });
        productObject.saledValue = productObject.totalCount.times(salePrice);




        // fetch and update customers data
        let [selectedCustomeFromData] = await mysqlPool.query(`SELECT * FROM customers WHERE id =${customerIdFrom}`);
        selectedCustomeFromData = selectedCustomeFromData[0];
        let selectedCustomeToData = selectedCustomeFromData;

        if (customerIdTo == customerIdFrom) {
            await updateCustomerData(connection, customerIdFrom, workingTypeId, selectedCustomeFromData, allWorkTypeData, productObject, "saleProduct", salePrice);
        } else {
            let [selectedCustomeToData] = await mysqlPool.query(`SELECT * FROM customers WHERE id =${customerIdTo}`);
            selectedCustomeToData = selectedCustomeToData[0];
            await updateCustomerData(connection, customerIdFrom, workingTypeId, selectedCustomeFromData, allWorkTypeData, productObject, "saleProduct", salePrice);
            await updateCustomerData(connection, customerIdTo, workingTypeId, selectedCustomeToData, allWorkTypeData, productObject, "", salePrice);
        }

        productObject.selectedCustomerToName = selectedCustomeToData.name;
        productObject.selectedCustomerFromName = selectedCustomeFromData.name;

        // update customer data
        console.dir("selectedCustomeToData: ");
        console.dir(selectedCustomeToData);
        let updatedDebt = new Decimal(selectedCustomeToData.debt);

        // update customer updatedDebt by transactionType
        updatedDebt = (updatedDebt.plus(productObject.saledValue)).toNumber();
        const customerTransactionDescription = `Товар на сумму ${salePrice} рублей (* ${productObject.totalCount} метров товара) был продан ${productObject.selectedCustomerToName}. Тип продукта: ${productObject.selectedWorkTypeName}, тип синтифона: ${productObject.selectedPolyesterName} \n Список выбранных продуктов: ${productObject.caculatedCountList}`;
        const [updateCustomerResult] = await connection.query('UPDATE customers SET debt = ? WHERE id = ?', [updatedDebt, customerIdTo]);
        const [createCustomerTransactionResult] = await connection.query('INSERT INTO customersTransactions (createdTime, transactionAmount, transactionType, transactionDesc, customerId, customerName) VALUES (?, ?, ?, ?, ?, ?)', [createdTime, productObject.saledValue.toNumber(), "+", customerTransactionDescription, customerIdTo, selectedCustomeToData.name]);
        if (!updateCustomerResult || !createCustomerTransactionResult) {
            return genericErrorHandler(res);
        }

        productObject.totalCount = productObject.totalCount.toNumber();
        productObject.saledValue = productObject.saledValue.toNumber();

        const [result] = await connection.query('INSERT INTO selling (customerFromId, customerToId, workingTypeId, salePrice, data, createdTime ) VALUES (?, ?, ?, ?, ?, ?)', [customerIdFrom, customerIdTo, workingTypeId, salePrice, JSON.stringify(productObject), createdTime]);
        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            await connection.commit();
            return res.status(200).send({
                success: true,
                message: `sale successfully created`,
                data: result.insertId
            });
        }
    } catch (e) {
        connection.rollback();
        console.log(e);
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    } finally {
        if (connection) await connection.release();
    }
}

const getAllSales = async(req, res) => {
    try {
        let query = 'SELECT * FROM selling WHERE 1=1';
        const queryParams = [];
        if (req.query.fromTime && req.query.toTime) {
            query += ' AND createdTime BETWEEN ? AND ?';
            queryParams.push(req.query.fromTime, req.query.toTime);
        }
        if (req.query.customerId) {
            query += ' AND customerToId = ?';
            queryParams.push(req.query.customerId);
        }
        query += ' ORDER BY createdTime DESC'

        const [customerListResponse] = await mysqlPool.query('SELECT name, id FROM customers');
        const [rows] = await mysqlPool.query(query, queryParams);

        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            const parsedRows = rows.map(row => ({
                ...row,
                data: row.data ? parseRowData(row.data) : null
            }));
            return res.status(200).send({
                success: true,
                message: "All user records",
                data: {
                    "sales": parsedRows,
                    "customerList": customerListResponse,
                },
            });
        }
    } catch (e) {
        console.dir(e);
        return res.status(404).send({
            success: false,
            message: "no records found",
            data: e,
        });
    }
};

const getSaleById = async(req, res) => {
    try {
        const id = req.params.id;
        const [rows] = await mysqlPool.query(`SELECT * FROM selling WHERE id =${id}`);
        if (!rows) {
            return res.status(404).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            rows[0].data = rows[0].data ? parseRowData(rows[0].data) : null
            return res.status(200).send({
                success: true,
                message: `sale(${id}) record`,
                data: rows[0],
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



const createWorkType = async(req, res) => {
    try {
        let { name, workingPrice, sellingPrice } = req.body;
        workingPrice = (typeof workingPrice === 'undefined' || workingPrice === '') ? 0 : workingPrice;
        sellingPrice = (typeof sellingPrice === 'undefined' || sellingPrice === '') ? 0 : sellingPrice;

        if (workingPrice == 0) {
            return res.status(500).send({
                success: false,
                message: `Unknwon parametr`,
            });
        }

        const [result] = await mysqlPool.query('INSERT INTO workType (name, workingPrice, sellingPrice ) VALUES (?, ?, ?)', [name, workingPrice, sellingPrice]);
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
                data: "success"
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
const getAllWorkerType = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM workType');
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: true,
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
const updateWorkType = async(req, res) => {
    try {
        let { id, name, workingPrice, sellingPrice } = req.body;
        workingPrice = (typeof workingPrice === 'undefined' || workingPrice === '') ? 0 : workingPrice;
        sellingPrice = (typeof sellingPrice === 'undefined' || sellingPrice === '') ? 0 : sellingPrice;

        if (workingPrice == 0) {
            return res.status(500).send({
                success: false,
                message: `Unknwon parametr`,
            });
        }
        let query = 'UPDATE workType SET name = ?, workingPrice = ?, sellingPrice = ?  WHERE id = ?';
        const queryParams = [name, workingPrice, sellingPrice, id];
        const [result] = await mysqlPool.query(query, queryParams);
        if (!result) {

            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected sintifon(${id}) is updated successfully`,
                data: "success"
            });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).send({
            success: false,
            message: "Fail to make db operation",
            data: e,
        });
    }
}

const createSintifon = async(req, res) => {
    try {
        let { name, count } = req.body;
        count = (typeof count === 'undefined' || count === '') ? 0 : count;

        const [result] = await mysqlPool.query('INSERT INTO sintifon (name, count) VALUES (?, ?)', [name, count]);
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
                data: "success"
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
const getAllSintifon = async(req, res) => {
    try {
        const [rows] = await mysqlPool.query('SELECT * FROM sintifon');
        if (!rows) {
            return res.status(500).send({
                success: false,
                message: "Fail to make db operation",
            });
        } else {
            return res.status(200).send({
                success: true,
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
const updateSintifon = async(req, res) => {
    try {
        const { id, name, count, chanchedCount, transactionType } = req.body;
        let query = 'UPDATE sintifon SET ';
        const queryParams = [];

        if (typeof chanchedCount !== 'undefined' && typeof chanchedCount !== "" && typeof transactionType !== 'undefined' && typeof transactionType !== "") {

            const [selectedSintifonData] = await mysqlPool.query(`SELECT * FROM sintifon WHERE id =${id}`);
            let updatedCount = new Decimal(selectedSintifonData[0].count);

            if (transactionType === '+') {
                updatedCount = updatedCount.plus(new Decimal(chanchedCount));
            } else if (transactionType === '-') {
                updatedCount = updatedCount.minus(new Decimal(chanchedCount));
            }
            query += 'count = ?';
            queryParams.push(updatedCount.toNumber());
        } else {
            if (typeof name !== 'undefined' && name !== "" && typeof count !== 'undefined' && count !== "") {
                console.log('count => ' + count);
                query += 'name = ?, count = ?';
                queryParams.push(name, count);
            } else if (typeof name !== 'undefined' && name !== "") {
                query += 'name = ?';
                queryParams.push(name);
            } else if (typeof count !== 'undefined' && count !== "") {
                query += 'count = ?';
                queryParams.push(count);
            } else {
                return res.status(400).send({
                    success: false,
                    message: 'No valid parameters provided for update.',
                    data: "success"
                });
            }
        }



        queryParams.push(id);
        query += ' WHERE id = ?';


        const [result] = await mysqlPool.query(query, queryParams);

        if (!result) {
            return res.status(500).send({
                success: false,
                message: `Fail to make db operation`,
            });
        } else {
            return res.status(200).send({
                success: true,
                message: `selected sintifon(${id}) is updated successfully`,
                data: "success"
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

function genericErrorHandler(res) {
    return res.status(500).send({
        success: false,
        message: `Fail to make db operation from genericErrorHandler`,
    });
}

export { createSintifon, getAllSintifon, updateSintifon, createWorkType, getAllWorkerType, updateWorkType, getMakeProductPageData, makeProduct, getAllProducts, makeSale, getAllSales, getSaleById };