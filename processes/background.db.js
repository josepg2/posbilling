const path = require('path');
const fs = require('fs');
const {ipcRenderer} = require('electron');
const storage = require('electron-json-storage');
const dataPath = storage.getDataPath();
const mkdirp = require('mkdirp');
if(!fs.existsSync(dataPath)) {
    mkdirp.sync(dataPath)
}
const knex = require('knex')({
    client:"sqlite3",
    connection: {
        filename : path.join(dataPath, "posbillingsystem.sqlite").toString()
        //filename : path.join(dataPath, "testdatabase.sqlite").toString()
    },
    useNullAsDefault: true
});
const fp = require("find-free-port");
const express = require('express');
const app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get('/', (req, res) => res.send('Hello World!'));

app.get('/api/inventory', getInventory)
app.post('/api/item', addToInventory)
app.post('/api/itemedit', editInventory)
app.post('/api/itemremove', removeInventory)

app.get('/api/bill', getBill)
app.get('/api/billitems', getBillItems)
app.post('/api/newbill', addToBill)

app.get('/api/purchase', getPurchase)
app.get('/api/purchaseitems', getPurchaseItems)
app.post('/api/purchase', addToPurchase)

app.get('/api/tax', getTax)
app.post('/api/tax', addNewTax)
app.delete('/api/tax', removeTax)

app.get('/api/category', getCategory)
app.post('/api/category', addToCategory)
app.post('/api/updatecategory', updateCategory)
app.delete('/api/category', removeCategory)

app.get('/api/offers', getOffers)
app.post('/api/offers', addNewOffer)
app.post('/api/updateoffer', updateOffer)
app.delete('/api/offers', removeOffer)

app.get('/api/users', getUsers)
app.post('/api/user', addNewUser)
app.post('/api/updateuser', updateUser)
app.post('/api/removeuser', removeUser)

app.get('/api/storeid', getStoreId)

createTables();

function getStoreId(req, res, next){
    knex('storeid')
        .select()
        .then(response => {
            res.status(200).json(response[0]);
        })
}

function getTax(req, res, next){
    knex('taxes')
      .select('taxid', 'taxname', 'taxvalue')
      .then(response => {
          res.status(200).json({status : 'success', data : response});
      })
      .catch(error => {
          res.status(200).json({status : 'failed'});
      })
}

function addNewTax(req, res, next){
    let data = req.body;
    knex('taxes')
        .insert([{
            taxname : data.taxname,
            taxvalue: data.taxvalue
        }])
        .then(response => {
            getTax(req, res, next)
        })
        .catch(error => {
            console.log(error)
            res.status(200).json({status : 'failed', err : error});
        })
}

function removeTax(req, res, next){  
    knex('taxes')
      .where('taxid', parseInt(req.query.id))
      .del()
      .then(response => {
          return knex('inventory')
                    .where('tax', parseInt(req.query.id))
                    .update('tax', parseInt(req.query.replace))
      })
      .then(response => {
        res.status(200).json({status : 'success', id : parseInt(req.query.id), output : response})
      })
      .catch(error => {
          res.status(200).json({status : 'failed'})
      })
}

function getUsers(req, res, next){
    knex('users')
        .select()
        .where('active', true)
        .then(response => {
            res.status(200).json({status : "success", data : response});
        })
        .catch(error => {
            res.status(200).json({status : 'failed'});
        })
}

function getOffers(req, res, next){
    knex('offers')
      .select('offerid', 'name', 'type', 'value')
      .then(response => {
          res.status(200).json({status : 'success', data : response});
      })
      .catch(error => {
          res.status(200).json({status : 'failed'});
      })
}

function addNewOffer(req, res, next){
    let data = req.body;
    knex('storeid')
        .select('offerid')
        .then(response => {
            return knex('offers')
                 .insert([{
                     offerid : response[0].offerid + 1,
                     name : data.name,
                     type  : data.type,
                     value  : data.value
                 }])
        })
        .then(response => {
            return knex('storeid')
                    .where("key", "storeidkey")
                    .increment('offerid', 1)
        })
        .then(response => {
            getOffers(req, res, next);
        })
        .catch(error => {
            console.log(error)
            res.status(200).json({status : 'failed'})
        })
}

function updateOffer(req, res, next){
    let data = req.body;
    knex('offers')
      .where('offerid', data.offerid)
      .update({
            'name' : data.name,
            'type'  : data.type,
            'value'  : data.value
      })
      .then(response => {
          return knex('inventory')
                    .where('hasoff', data.offerid)
                    .update({
                                'offtype': data.type,
                                'offvalue' : data.value
                            })
      })
      .then(response => {
        res.status(200).json({status : 'success', output : response[0]})
      })
      .catch(error => {
        res.status(200).json({status : 'failed'})
      })
}

function removeOffer(req, res, next){  
    knex('offers')
      .where('offerid', parseInt(req.query.id))
      .del()
      .then(response => {
          return knex('inventory')
                    .where('hasoff', parseInt(req.query.id))
                    .update({
                                'hasoff' : parseInt(req.query.replace),
                                'offtype': 'rupee',
                                'offvalue' : 0
                            })
      })
      .then(response => {
        res.status(200).json({status : 'success',id : parseInt(req.query.id), output : response})
      })
      .catch(error => {
          res.status(200).json({status : 'failed'})
      })
}

function addNewUser(req, res, next){
    let data = req.body;
    knex('users')
        .insert([{
            username : data.username,
            password : data.password,
            isadmin  : false,
            canedit  : data.canedit,
            active   : true
        }])
        .then(response => {
            getUsers(req, res, next);
            //res.status(200).json(response);
        })
        .catch(error => {
            console.log(error)
            res.status(200).json({status : 'failed'})
        })
}

function updateUser(req, res, next){
    let data = req.body;
    knex('users')
        .where('username', data.username)
        .update({
            "password" : data.password,
            "canedit"  : data.canedit
        })
        .then(response => {
            res.status(200).json({status: 'success'});
        })
        .catch(error => {
            console.log(error);
            res.status(200).json({status : 'failed'})
        })
}

function removeUser(req, res, next){
    let data = req.body;
    knex('users')
        .where('id', data.id)
        .update('active', false)
        .then(response => {
            res.status(200).json({status: 'success'});
        })
        .catch(error => {
            console.log(error)
            res.status(200).json({status : 'failed'})
        })
}

function getCategory(req, res, next){
    knex('category')
      .select('id', 'name', 'description')
      .then(response => {
          res.status(200).json({status : 'success', data : response});
      })
      .catch(error => {
          res.status(200).json({status : 'failed'});
      })
}

function updateCategory(req, res, next){
    let data = req.body;
    knex('category')
        .where('id', data.id)
        .update({
            "name" : data.name,
            "description"  : data.description
        })
        .then(response => {
            getCategory(req, res, next);
        })
        .catch(error => {
            console.log(error);
            res.status(200).json({status : 'failed'})
        })
}

function removeCategory(req, res, next){  
    knex('category')
      .where('id', parseInt(req.query.id))
      .del()
      .then(response => {
          return knex('inventory')
                    .where('category', parseInt(req.query.id))
                    .update('category', parseInt(req.query.replace))
      })
      .then(response => {
        res.status(200).json({status : 'success', id : parseInt(req.query.id), output : response})
      })
      .catch(error => {
          res.status(200).json({'status' : 'failed'})
      })
}

function addToCategory(req, res, next){
    let data = req.body;
    knex('category')
        .insert([{
            name : data.name,
            description : data.description,
            count: 0
        }])
        .then(response => {
            return knex('category')
                .select()
        })
        .then(response => {
            res.status(200).json({status : 'success', data : response});
        })
        .catch(error => {
            res.status(200).json({status : 'failed', error : error});
        })
}

function getBillItems(req, res, next) {
    knex('salesitems')
        .where("billid", req.query.billid)
        .select('prodid', 'prodname', 'quantity', 'tax', 'offvalue', 'unitprice')
        .then(response => {
            res.status(200).json(response);
        })
        .catch(error => {
            req.status(200).json({status: 'error'});
        })
}

function getBill(req, res, next){
    knex('sales')
        .whereNot("created_at" , "<", req.query.dateFrom)
        .andWhereNot("created_at" , ">", req.query.dateTo)
        .select()
        .then(response => {
            for (let i = 0; i < response.length; i++) {
                response[i].created_at = response[i].created_at + ' UTC';
                response[i].items = [];
            }
            res.status(200).json(response);
        })
        .catch(error => {
            res.status(200);
        })
}

function getInventory(req, res, next) {
    console.log("inside");
    knex.select(
            "i.prodid",
            "i.prodname",
            "i.proddisc",
            "i.stock",
            "i.unitprice",
            "i.category",
            "c.name AS categoryname",
            "i.tax",
            "t.taxname",
            "t.taxvalue",
            "i.hasoff",
            "i.offtype",
            "i.offvalue",
            "o.name AS offername",
            "i.updated_by",
            "i.updated_at"
        )
        .from('inventory AS i')
        .where('isremoved', false)
        .leftJoin('category AS c', 'i.category', 'c.id')
        .leftJoin('taxes AS t', 'i.tax', 't.taxid')
        .leftJoin('offers AS o', 'hasoff', 'o.offerid')
        .then(function (response) {
            console.log(response)
            for (let i = 0; i < response.length; i++) {
                response[i].updated_at = response[i].updated_at + ' UTC';
            }
            res.status(200).json(response);
            next();
        });
}

// function getInventory(req, res, next){
//     console.log("inside i");
//     knex('inventory')
//         .where('isremoved', false)
//         .select()
//         .then(function (response) {
//             for (let i = 0; i < response.length; i++) {
//                 response[i].isremoved = !!+response[i].isremoved;
//                 response[i].created_at = response[i].created_at + ' UTC';
//                 response[i].updated_at = response[i].updated_at + ' UTC';
//             }
//             res.status(200).json(response);
//             next();
//         });
// }

function addToInventory(req, res, next) {
    let data = req.body;
    knex('inventory')
        .insert({
            "prodid": data.prodid,
            "prodname": data.prodname,
            "proddisc": data.proddisc,
            "isremoved": false,
            "stock": data.stock,
            "unitprice": data.unitprice,
            "category": data.category,
            "tax": data.tax,
            "hasoff": data.hasoff,
            "offtype": data.offtype,
            "offvalue": data.offvalue,
            "updated_by": data.updated_by
        }).then(function (response) {
            return knex('inventory')
                .where("prodid", data.prodid)
                .select("id")
        })
        .then(response => {
            return knex('storeid')
                .where("key", "storeidkey")
                .update("prodid", response[0].id)
        })
        .then(function (response) {
            console.log(response);
            data.status = 'ok';
            res.send(data);
        })
        .catch(function (error) {
            console.log(error);
            data.status = 'error';
            data.error = error.Error;
            res.send(data);
        })
}

function editInventory(req, res, next) {
    let data = req.body;
    knex('inventory')
        .where("prodid", data.prodid)
        .update({
            "prodname": data.prodname,
            "proddisc": data.proddisc,
            "isremoved": false,
            "stock": data.stock,
            "unitprice": data.unitprice,
            "category": data.category,
            "tax": data.tax,
            "hasoff": data.hasoff,
            "offtype": data.offtype,
            "offvalue": data.offvalue,
            "updated_by": "gj",
            "updated_at": knex.fn.now()
        })
        .then(response => {
            console.log(response);
            data.status = 'ok';
            res.send(data);
        })
        .catch(error => {
            data.error = error.Error;
            data.status = 'error';
            res.send(data);
        })
}

function removeInventory(req, res, next) {
    let data = req.body;
    knex('inventory')
        .where("prodid", data.prodid)
        .update({
            "isremoved": true,
            "updated_at": knex.fn.now()
        })
        .then(response => {
            console.log(response);
            data.status = 'ok';
            res.send(data);
        })
        .catch(error => {
            data.error = error.Error;
            data.status = 'error';
            res.send(data);
        })
}

function addToBill(req, res, next) {
    let bill = req.body;
    let arrSales = [];
    let arrInventory = [];
    knex('sales')
        .insert({
            "billid": bill.billid,
            "tax": bill.tax,
            "offvalue": bill.offvalue,
            "total": bill.total,
            "created_by": "gj"
        })
        .then(response => {
            return knex('storeid')
                .where("key", "storeidkey")
                .increment('billid', 1)
        })
        .then(response => {
            bill.items.forEach(item => {
                arrSales.push(
                    knex('salesitems')
                    .insert({
                        "billid": bill.billid,
                        "prodid": item.prodid,
                        "prodname": item.prodname,
                        "quantity": item.quantity,
                        "unitprice": item.unitprice,
                        "tax": item.tax,
                        "offvalue": item.offvalue
                    })
                )
            })
            return Promise.all(arrSales);
        })
        .then(response => {
            bill.items.forEach(item => {
                arrInventory.push(
                    knex('inventory')
                    .where("prodid", item.prodid)
                    .decrement("stock", item.quantity)
                )
            })
            return Promise.all(arrInventory);
        })
        .then(response => {
            console.log(response);
            res.status(200).json(response);
        })
}

function addToPurchase(req, res, next) {
    console.log("here")
    let purchase = req.body;
    let arrPurchase = [];
    let arrInventory = [];
    knex('purchase')
        .insert({
            "purchaseid": purchase.purchaseid,
            "discount": purchase.discount,
            "total": purchase.total,
            "created_by": "gj"
        })
        .then(response => {
            return knex('storeid')
                .where("key", "storeidkey")
                .increment('purchaseid', 1)
        })
        .then(response => {
            purchase.items.forEach(item => {
                arrPurchase.push(
                    knex('purchaseitems')
                    .insert({
                        "purchaseid": purchase.purchaseid,
                        "prodid": item.prodid,
                        "quantity": item.quantity,
                        "unitprice": item.unitprice,
                    })
                )
            })
            return Promise.all(arrPurchase);
        })
        .then(response => {
            purchase.items.forEach(item => {
                arrInventory.push(
                    knex('inventory')
                    .where("prodid", item.prodid)
                    .increment("stock", item.quantity)
                )
            })
            return Promise.all(arrInventory);
        })
        .then(response => {
            console.log(response);
            res.status(200).json(response);
        })
}

function getPurchase(req, res, next){
    knex('purchase')
        .whereNot("created_at" , "<", req.query.dateFrom)
        .andWhereNot("created_at" , ">", req.query.dateTo)
        .select()
        .then(response => {
            for (let i = 0; i < response.length; i++) {
                response[i].created_at = response[i].created_at + ' UTC';
                response[i].items = [];
            }
            res.status(200).json(response);
        })
        .catch(error => {
            res.status(200);
        })
}

function getPurchaseItems(req, res, next) {
    knex('purchaseitems')
        .where("purchaseid", req.query.purchaseid)
        .join("inventory", "purchaseitems.prodid", "inventory.prodid")
        .select('purchaseitems.prodid', 'inventory.prodname', 'purchaseitems.quantity', 'inventory.tax', 'purchaseitems.unitprice')
        .then(response => {
            res.status(200).json(response);
        })
        .catch(error => {
            req.status(200).json({status: 'error'});
        })
}

function createTables() {

    knex.schema.hasTable('storeid')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('storeid', function (table) {
                    table.increments();
                    table.string("key");
                    table.integer("prodid");
                    table.integer("billid");
                    table.integer("purchaseid");
                    table.integer("offerid");
                    table.timestamp("updated_at").defaultTo(knex.fn.now());
                });
            }
        })
        .then((response) => {
            if (response) {
                return knex('storeid')
                    .insert({
                        key: "storeidkey"
                    })
            }
        })
        .catch((error) => {
            console.log(error);
        });

    knex.schema.hasTable('inventory')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('inventory', function (table) {
                    table.increments("id");
                    table.string("prodid", 5);
                    table.string("prodname");
                    table.string("proddisc");
                    table.boolean("isremoved");
                    table.integer("stock");
                    table.float("unitprice", 9, 2);
                    table.integer("category");
                    table.integer("tax");
                    table.integer("hasoff");
                    table.string("offtype");
                    table.float("offvalue", 9, 2);
                    table.string("updated_by");
                    table.timestamps(false, true);
                    table.unique("prodid");
                });
            }
        })
        .then(response => {
            if (response) {
                return knex('inventory')
                    .insert({
                        "prodid": "1"
                    })
            }
        })
        .then(response => {
            if (response) {
                return knex('inventory')
                    .where("prodid", "1")
                    .select("id")
            }
        })
        .then(response => {
            if (response) {
                return knex('storeid')
                    .where("key", "storeidkey")
                    .update("prodid", response[0].id)
            }
        })
        .then(response => {
            if (response) {
                return knex('inventory')
                    .where("prodid", "1")
                    .del()
            }
        })
        .catch(error => {
            console.log(error);
        })

    knex.schema.hasTable('users').then(function (exists) {
        if (!exists) {
            return knex.schema.createTable('users', function (table) {
                table.increments();
                table.string("username");
                table.string("password");
                table.boolean("isadmin");
                table.boolean("canedit");
                table.boolean('active');
                table.timestamp("created_at").defaultTo(knex.fn.now());
                table.unique('username');
            });
        }
    })
    .then(response => {
        if(response) {
            return knex('users')
                .insert([{
                    username : 'admin',
                    password : 'admin',
                    isadmin  : true,
                    canedit  : true,
                    active : true
                }])
        }
    })
    .catch(error => {
        console.log(error);
    })

    knex.schema.hasTable('sales').then(function (exists) {
        if (!exists) {
            return knex.schema.createTable('sales', function (table) {
                    table.increments('id');
                    table.string("billid");
                    table.float("tax");
                    table.float("offvalue");
                    table.float("total");
                    table.string("created_by");
                    table.timestamp("created_at").defaultTo(knex.fn.now());
                })
                .then(response => {
                    if (response) {
                        return knex('sales')
                            .insert({
                                "billid": "1"
                            })
                    }
                })
                .then(response => {
                    if (response) {
                        return knex('sales')
                            .where("billid", "1")
                            .select("id")
                    }
                })
                .then(response => {
                    if (response) {
                        return knex('storeid')
                            .where("key", "storeidkey")
                            .update("billid", response[0].id)
                    }
                })
                .then(response => {
                    if (response) {
                        return knex('sales')
                            .where("billid", "1")
                            .del()
                    }
                })
                .catch(error => {
                    console.log(error);
                })
        }
    });

    knex.schema.hasTable('salesitems')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('salesitems', function (table) {
                    table.increments();
                    table.string("billid");
                    table.string("prodid");
                    table.string("prodname");
                    table.integer("quantity");
                    table.float("unitprice");
                    table.float("tax");
                    table.float("offvalue");
                })
            }
        })

    knex.schema.hasTable('purchase')
        .then(function (exists) {
            if(!exists){
                return knex.schema.createTable('purchase', function (table){
                    table.increments('id');
                    table.string('purchaseid');
                    table.float('total');
                    table.float('discount');
                    table.string("created_by");
                    table.timestamp("created_at").defaultTo(knex.fn.now());
                    table.unique('purchaseid');
                })
            }
        })
        .then(response => {
            if (response) {
                return knex('purchase')
                    .insert({
                        "purchaseid": "1"
                    })
            }
        })
        .then(response => {
            if (response) {
                return knex('purchase')
                        .where("purchaseid", "1")
                        .select("id")
            }
        })
        .then(response => {
            if (response) {
                return knex('storeid')
                    .where("key", "storeidkey")
                    .update("purchaseid", response[0].id)
            }
        })
        .then(response => {
            if (response) {
                return knex('purchase')
                    .where("purchaseid", "1")
                    .del()
            }
        })
        .catch(error => {
            console.log(error);
        })

    knex.schema.hasTable('purchaseitems')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('purchaseitems', function (table) {
                    table.increments();
                    table.string("purchaseid");
                    table.string("prodid");
                    table.integer("quantity");
                    table.float("unitprice");
                })
            }
        })

    knex.schema.hasTable('taxes')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('taxes', function (table) {
                    table.increments('taxid');
                    table.string("taxname");
                    table.integer("taxvalue");
                    table.timestamp("updated_at").defaultTo(knex.fn.now());
                    table.unique("taxname");
                });
            }
        })
        .then(response => {
            if(response){
                return knex('taxes')
                        .insert([{
                            taxname : 'None',
                            taxvalue: 0
                        },{
                            taxname : 'GST @ 0%',
                            taxvalue: 0
                        },{
                            taxname : 'GST @ 5%',
                            taxvalue: 5
                        },{
                            taxname : 'GST @ 10%',
                            taxvalue: 10
                        },{
                            taxname : 'GST @ 18%',
                            taxvalue: 18
                        },{
                            taxname : 'GST @ 28%',
                            taxvalue: 28
                        }])
            }
        })
        .catch(error => {
            console.log(error);
        })

    knex.schema.hasTable('category')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('category', function (table) {
                    table.increments('id');
                    table.string("name");
                    table.integer("count");
                    table.timestamp("updated_at").defaultTo(knex.fn.now());
                    table.unique("name");
                });
            }
        })
        .then(response => {
            if(response) {
                return knex('category')
                           .insert([{
                                name : 'None',
                                count: 0
                           },{
                            name : 'Category 1',
                            count: 1
                       },{
                        name : 'Category 2',
                        count: 2
                   },{
                    name : 'Category 3',
                    count: 3
               }])
            }
        })
        .catch(error => {
            console.log(error);
        })

    knex.schema.hasColumn('category', 'description')
        .then(function (exists) {
            if(!exists) {
                return knex.schema.table('category', function (table) {
                    table.string('description')
                })
            }
        })
        .then(response => {
            if(response){
                console.log(response);
            }
        })
        .catch(error => {
            console.log(error);
        })

    knex.schema.hasTable('offers')
        .then(function (exists) {
            if (!exists) {
                return knex.schema.createTable('offers', function (table) {
                    table.increments();
                    table.integer('offerid');
                    table.string("name");
                    table.string('type');
                    table.integer('value');
                    table.unique('name');
                });
            }
        })
        .then(response => {
            if(response){
                return knex('offers')
                        .insert([{
                            offerid : 0,
                            name : 'None',
                            type : 'rupee',
                            value : 0
                        },
                        {
                            offerid : 1,
                            name : 'Custom',
                            type : 'rupee',
                            value : 0
                        }
                    ])
            }
        })
        .then(response => {
            return knex('storeid')
                    .where("key", "storeidkey")
                    .update("offerid", 1)
        })
        .catch(error => {
            console.log(error);
        })

}

fp(3000).then(([freep]) => {
    console.log('found ' + freep);
    app.listen(freep, () => console.log('Example app listening on port 3000!'));
    ipcRenderer.send("port", freep);
}).catch((err)=>{
    console.error(err);
});

