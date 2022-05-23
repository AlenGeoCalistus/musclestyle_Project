var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const async = require('hbs/lib/async');
const { reject } = require('bcrypt/promises');
const { response } = require('express');
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path');
const paypal = require('paypal-rest-sdk')

paypal.configure({
    'mode': 'sandbox',
    'client_id': 'AYKy7ajxq9bQFzATPus3nqctBocpoZ9REG7tEQHiDCf2HpKmqsOMzB2y0ZrJ9tMJom_ezrkBWXW8MsC1',
    'client_secret': 'EOF9T36k2Sbp-4djGIvAt88cthYl6Bx47XcYnOiwcCF7D5eccvKsHXHZ7NOKKGkyS0e6WfNEphZ-S6G5'
});


// function getdate() {
//     const d_t = new Date();
//     let year = d_t.getFullYear();
//     let month = ("0" + (d_t.getMonth() + 1)).slice(-2);
//     let day = ("0" + d_t.getDate()).slice(-2);
//     let hour = d_t.getHours();
//     let minute = d_t.getMinutes();
//     let seconds = d_t.getSeconds();
//     let dateNtime = (year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + seconds);
//     console.log('dateNtime');
//     return (dateNtime);
// }


//Razorpay instance
var instance = new Razorpay({
    key_id: 'rzp_test_lST5YpC1PFeGOy',
    key_secret: 'V17JHUnoFl9NymK2Kx2mXvJK'
});


module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTIONS).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
        })

    },
    adminDoSignup: (adminData) => {
        return new Promise(async (resolve, reject) => {
            adminData.password = await bcrypt.hash(adminData.password, 10)
            db.get().collection(collection.ADMIN_COLLECTIONS).insertOne(adminData).then((adminData) => {
                resolve(adminData.insertedId)
            })
        })

    },
    //! NORMAL LOGIN
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {};
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ email: userData.email })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {

                    if (status) {

                        if (user.blockStatus) {
                            response.blocked = true;
                            resolve(response)

                        } else {
                            console.log("Logged in successfully");
                            response.user = user
                            response.status = true;
                            resolve(response);
                        }

                    } else {
                        console.log("Login failed");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    //! NORMAL LOGIN END
    adminDoLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            // let loginStatus = false;
            let response = {};
            let admin = await db.get().collection(collection.ADMIN_COLLECTIONS).findOne({ email: adminData.email })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((adminStatus) => {
                    if (adminStatus) {
                        console.log("Logged in successfully");
                        response.admin = admin
                        response.adminStatus = true;
                        resolve(response);
                    } else {
                        console.log("Login failed");
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },
    addToCart: (prodId, userId) => {
        let proObj = {
            item: objectId(prodId),
            quantity: 1,
            offer: Boolean,
            discount: 0,
        }
        return new Promise(async (resolve, reject) => {
            let discountCheck = await db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({ _id: objectId(prodId) })
            if (discountCheck.discount != 0) {
                proObj.discount = discountCheck.discount
                proObj.offer = true;
                console.log('puseheddddddddddddddddd', proObj);
            }
            let userCart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == prodId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTIONS)
                        .updateOne({ user: objectId(userId), 'products.item': objectId(prodId) }, {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {
                    db.get().collection(collection.CART_COLLECTIONS)
                        .updateOne({ user: objectId(userId) },
                            {
                                $push: { products: proObj }
                            }).then((response) => {
                                resolve()
                            })
                }
            } else {
                let cartObj = {
                    user: objectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTIONS).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTIONS).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    getAdmin: (adminId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTIONS)
                    .updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTIONS)
                    .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then(() => {
                        resolve({ status: true })
                    })
            }

        })
    },

    removeProduct: (details) => {
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTIONS)
                .updateOne({ _id: objectId(details.cart) },
                    {
                        $pull: { products: { item: objectId(details.product) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })
        })
    },

    // getTotalDiscount: (userId)=>{
    //     return new Promise(async(resolve,reject)=>{
    //         let discount = await db.get().collection(collection.CART_COLLECTIONS).findOne({user:objectId(userId)})
    //         console.log('checkingggggggggggggggggggggggggggggggg',discount.products.quantity);
    //         console.log('checkingggggggggggggggggggggggggggggggg',discount);
    //     })
    // },



    getTotalDiscount: (userId) => {
        return new Promise(async (resolve, reject) => {

            let total = await db.get().collection(collection.CART_COLLECTIONS).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        discount: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }, { $toInt: '$product.discount' }] } }

                    }
                }
            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].discount)
        })
    },

    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {

            let total = await db.get().collection(collection.CART_COLLECTIONS).aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)
        })
    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'COD' ? 'Order Placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    address: order.address,
                    phone: order.phone,
                    city: order.city,
                    state: order.state,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTIONS).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTIONS).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },

    placeOrderPaypal: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total);
            let status = order['payment-method'] === 'PAYPAL' ? 'pending' : 'reject'
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    address: order.address,
                    phone: order.phone,
                    city: order.city,
                    state: order.state,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTIONS).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTIONS).deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTIONS).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTIONS)
                .find({ userId: objectId(userId) }).toArray()
            // console.log(orders);
            resolve(orders)
        })
    },
    cancelledOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let cancelledOrders = await db.get().collection(collection.CANCELLED_ORDER_COLLECTIONS)
                .find({ userId: objectId(userId) }).toArray()
            // console.log('cancelledorderssssssssssss',cancelledOrders);
            resolve(cancelledOrders)
        })
    },
    cancelOrders: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let cancelledOrder = await db.get().collection(collection.ORDER_COLLECTIONS)
                .findOne({ _id: objectId(orderId) })
            db.get().collection(collection.CANCELLED_ORDER_COLLECTIONS).insertOne(cancelledOrder)

            db.get().collection(collection.ORDER_COLLECTIONS)
                .findOne({ _id: objectId(orderId) }).then((response) => {
                    db.get().collection(collection.ORDER_COLLECTIONS).deleteOne({ _id: objectId(orderId) })
                    resolve(response)
                })


        })

    },
    getCancelledProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let cancelledOrderItems = await db.get().collection(collection.CANCELLED_ORDER_COLLECTIONS).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            console.log(cancelledOrderItems);
            resolve(cancelledOrderItems)
        })
    },
    getOrderedProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, totalAmount) => {
        return new Promise((resolve, reject) => {

            var options = {
                amount: totalAmount * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('new Order_', order);
                    resolve(order)
                }
            });
        })
    },

    generatePaypal: (orderId, totalAmount) => {
        let newOrderId = orderId.toString();
        let NewTotalAmt = totalAmount.toString()
        return new Promise((resolve, reject) => {
            const create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "Muscle Style",
                            "sku": "001",
                            "price": NewTotalAmt,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": NewTotalAmt
                    },
                    "description": "muscle Style"
                }]
            };
            resolve(create_payment_json)
            console.log('createpaymentttttttttttttttt', create_payment_json);
        })
    },


    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            var crypto = require("crypto");
            let hmac = crypto.createHmac('sha256', 'V17JHUnoFl9NymK2Kx2mXvJK')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex');
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTIONS)
                .updateOne({ _id: objectId(orderId) },
                    {
                        $set: {
                            status: 'Order Placed'
                        }
                    }
                ).then(() => {
                    resolve()
                })
        })
    },
    blockUsers: ((userId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, { $set: { blockStatus: true } })
            resolve()

        })
    }),
    unblockUsers: ((userId) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS)
                .updateOne({ _id: objectId(userId) }, { $set: { blockStatus: false } })
            resolve()

        })
    }),

    numberVerify: (phoneNumber) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS).find({ phoneNumber: { $eq: true } }).toArray()
            let numberStatus = false;
            if (phoneNumber) {
                numberStatus = true;
                console.log('ssssssssssssssssssss', numberStatus);
                resolve(numberStatus);
            }


        })
    },

    // getOneProduct: (prodId,userId) => {
    //     let proObj = {
    //         item: objectId(prodId),
    //         quantity: 1
    //     }
    //     return new Promise(async (resolve, reject) => {
    //         db.get().collection(collection.PRODUCT_COLLECTIONS).findOne({ product: objectId(prodId) })
    //         console.log('hhhhhhhhhhhhhhhhhhhhhhhhhhhh',prodId);
    //         resolve(prodId)
    //     })
    // },



    //! NORMAL LOGIN WITH OTP

    doOtpLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let Status = false;
            let response = {};
            console.log('userdateaaaaaaaaaaaaaaaa', userData);
            let user = await db.get().collection(collection.USER_COLLECTIONS).findOne({ phone: userData.phone })
            // console.log('fffffffffffffffffffffffffffffffffffffffffffffff',user.phone);
            // if (user) {
            //     bcrypt.compare(userData.password, user.password).then((status) => {
            if (userData.phone == user.phone) {
                // bcrypt.compare(userData.password, user.password).then((status) => {
                Status = true;
                    if (Status) {

                        if (user.blockStatus) {
                            response.blocked = true;
                            resolve(response)

                        } else {
                            console.log("Logged in successfully");
                            response.user = user
                            response.status = true;
                            resolve(response);
                        }

                    } else {
                        console.log("Login failed");
                        resolve({ status: false })
                    }
                // })
            } else {
                console.log("login failed");
                resolve({ status: false })
            }
        })
    },

    getUserdetailsWithMobile: (userDetails) => {
        return new Promise(async (resolve, reject) => {
            let details = await db.get().collection(collection.USER_COLLECTIONS).find({ phone: userDetails }).toArray()
            console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', details)
            resolve(details)
        })
    },

    //! NORMAL LOGIN WITH OTP END


    getUsername: (UserId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTIONS).findOne({ _id: objectId(UserId) }).then((user) => {
                resolve(user);
            })
        })
    },

    updateUserProfile: (userId, userDetails) => {
        return new Promise((resolve, reject) => {
            console.log('userIdddddddddddddddddddddddddd', userId);
            db.get().collection(collection.USER_COLLECTIONS).updateOne({ _id: objectId(userId) }, {
                $set: {
                    name: userDetails.name,
                    email: userDetails.email,
                    phone: userDetails.phone,
                    address: userDetails.address,
                    city: userDetails.city,
                    state: userDetails.state,
                    pincode: userDetails.pincode,
                    gender: userDetails.gender,
                }
            }).then((response) => {
                resolve();
            })
        })
    },


    // addNewAddress: (address, userId) => {
    //     return new Promise((resolve, reject) => {
    //         console.log(address);
    //         let addressObj = {
    //             addresses: {
    //                 name: address.name,
    //                 address: address.address,
    //                 phone: address.phone,
    //                 city: address.city,
    //                 state: address.state,
    //                 pincode: address.pincode,

    //             }

    //         }
    //         let userAddress ={
    //             user : objectId(userId),
    //             addresses:[addressObj]
    //         }
    //         db.get().collection(collection.ADDRESS_COLLECTIONS).insertOne({ user: objectId(userId) },
    //             {
    //                 $push: { address: userAddress }
    //             }).then((response) => {
    //                 resolve()
    //             })

    //     })


    // },

    //! Adding New Address
    addNewAddress: (address, userId) => {
        return new Promise((resolve, reject) => {
            console.log(address);
            let addressObj = {
                user: objectId(userId),
                name: address.name,
                address: address.address,
                phone: address.phone,
                city: address.city,
                state: address.state,
                pincode: address.pincode,

            }
            // user: objectId(userId),
            db.get().collection(collection.ADDRESS_COLLECTIONS).insertOne(addressObj).then((response) => {
                // console.log('kkkkkkkkkkkkkkkkkkkkkkkkkkkk',addressObj);
                resolve(addressObj);
            })
        })
    },
    //! Adding New Address End

    getAllAddress: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId);
            let allAddress = await db.get().collection(collection.ADDRESS_COLLECTIONS)
                .find({ user: objectId(userId) }).toArray()
            // console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', allAddress);
            resolve(allAddress)
        })
    },

    getChangedAddress: (addressId) => {
        return new Promise(async (resolve, reject) => {
            let oneAddress = await db.get().collection(collection.ADDRESS_COLLECTIONS)
                .findOne({ _id: objectId(addressId) })
            resolve(oneAddress)
        })
    },

    updatePass: (userData) => {
        return new Promise(async (resolve, reject) => {
            let oldpassword = userData.oldpassword;
            let user = await db.get().collection(collection.USER_COLLECTIONS)
                .findOne({ _id: objectId(userData.userId) })
            if (user) {
                bcrypt.compare(oldpassword, user.password).then(async (status) => {
                    if (status) {
                        userData.newpassword = await bcrypt.hash(userData.newpassword, 10)
                        db.get().collection(collection.USER_COLLECTIONS)
                            .updateOne({ _id: objectId(userData.userId) }, { $set: { password: userData.newpassword } })
                            .then(() => {
                                resolve({ status: true })
                            })
                    }
                })
            }
        })
    },

    modifyOrders: (orderId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTIONS)
                .findOne({ _id: objectId(orderId) }).then((response) => {
                    console.log('modifyOrdersresponseeeeeeeeeee', response)
                    resolve(response)
                })
        })
    },

    modifiedOrders: (statusId) => {
        return new Promise(async (resolve, reject) => [
            db.get().collection(collection.ORDER_COLLECTIONS)
                .updateOne({ _id: objectId(statusId.orderId) }, { $set: { status: statusId.status } }).then((status) => {
                    console.log('sssssssssssssssssssss', status);
                    resolve()
                })
        ])
    },

    getRazorpayCount: () => {
        return new Promise(async (resolve, reject) => {
            let razorpay = await db.get().collection(collection.ORDER_COLLECTIONS).find({ paymentMethod: 'ONLINE' }).toArray()
            console.log('razorrrr', razorpay)
            console.log('razorrrr', razorpay.length)
            resolve(razorpay.length)
        })
    },
    getRazorpayAmt: () => {
        return new Promise(async (resolve, reject) => {

            let razorTotal = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: { paymentMethod: 'ONLINE' }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('razorrrrrrrrrrrrrTotal', razorTotal[0].total);
            resolve(razorTotal[0].total)
        })
    },
    getCODAmt: () => {
        return new Promise(async (resolve, reject) => {

            let CODtotal = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: { paymentMethod: 'COD' }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('coddddddddddddddddTotal', CODtotal[0].total);
            resolve(CODtotal[0].total)
        })
    },
    getPaypalAmt: () => {
        return new Promise(async (resolve, reject) => {

            let paypalTotal = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: { paymentMethod: 'PAYPAL' }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('coddddddddddddddddTotal', paypalTotal[0].total);
            resolve(paypalTotal[0].total)
        })
    },
    getCODcount: () => {
        return new Promise(async (resolve, reject) => {
            let COD = await db.get().collection(collection.ORDER_COLLECTIONS).find({ paymentMethod: 'COD' }).toArray()
            resolve(COD.length)
        })
    },
    getPaypalCount: () => {
        return new Promise(async (resolve, reject) => {
            let paypal = await db.get().collection(collection.ORDER_COLLECTIONS).find({ paymentMethod: 'PAYPAL' }).toArray()
            resolve(paypal.length)
        })
    },


    getWeekReport: (lastWeek) => {
        return new Promise(async (resolve, reject) => {
            let lastWeekReport = await db.get().collection(collection.ORDER_COLLECTIONS)
                .find({ date: { $gte: lastWeek } }).toArray()
            resolve(lastWeekReport)

        })
    },
    getWeekTotal: (lastWeek) => {
        return new Promise(async (resolve, reject) => {

            let total = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: {
                        date:
                        {
                            $gte: lastWeek
                        }
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('total', total[0].total);
            resolve(total[0].total)
        })
    },
    getTotalSale: (Today) => {
        return new Promise(async (resolve, reject) => {
            let Total = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: {
                        date:
                        {
                            $gte: Today
                        }
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            // console.log('total', total[0].total);
            resolve(Total[0].total)
        })
    },
    getTodaySaleCount: (Today) => {
        return new Promise(async (resolve, reject) => {
            let todaySaleCount = await db.get().collection(collection.ORDER_COLLECTIONS)
                .find({ date: { $gt: Today } }).toArray()
            // console.log('todaysalecountttttttttttttttt',todaySaleCount);
            resolve(todaySaleCount)

        })
    },

    getMonthReport: (lastMonth) => {
        return new Promise(async (resolve, reject) => {
            let lastMonthReport = await db.get().collection(collection.ORDER_COLLECTIONS)
                .find({ date: { $gte: lastMonth } }).toArray()
            resolve(lastMonthReport)
        })
    },
    getMonthTotal: (lastMonth) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: {
                        date:
                        {
                            $gte: lastMonth
                        }
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('total', total[0].total);
            resolve(total[0].total)
        })
    },

    getYearReport: (lastYear) => {
        return new Promise(async (resolve, reject) => {
            let lastYearReport = await db.get().collection(collection.ORDER_COLLECTIONS)
                .find({ date: { $gte: lastYear } }).toArray()
            resolve(lastYearReport)
        })
    },
    getYearTotal: (lastYear) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.ORDER_COLLECTIONS).aggregate([
                {
                    $match: {
                        date:
                        {
                            $gte: lastYear
                        }
                    }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity',
                    }

                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTIONS,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {

                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.price' }] } }

                    }
                }
            ]).toArray()
            console.log('total', total[0].total);
            resolve(total[0].total)
        })
    },
    addCoupons: (coupon) => {
        let couponObj = {
            couponCode: coupon.couponcode,
            discountVal: coupon.discountvalue,
            offerStatus: true,
            users: []
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPONS_COLLECTIONS).insertOne({ couponObj }, {
            }).then((response) => {
                resolve();
            })
        })
    },
    searchMyCoupon: (userId) => {
        return new Promise(async (resolve, reject) => {
            let myCoupon = await db.get().collection(collection.COUPONS_COLLECTIONS).findOne()
            console.log('helpersssssssssssssss', myCoupon.couponObj.discountVal);
            resolve(myCoupon.couponObj.discountVal)

        })
    },
    couponAdded: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.COUPONS_COLLECTIONS).updateOne({}, { $push: { users: userId } })
            resolve()
        })
    },

    couponStatusCheck: (userId) => {
        let couponApplied = true;
        return new Promise(async (resolve, reject) => {
            let couponStatus = await db.get().collection(collection.COUPONS_COLLECTIONS).findOne({ users: userId })
            //    console.log('couponstatusssstsussssssssssss',couponStatus.users); 
            console.log('couponStatusssssss', couponStatus);
            if (couponStatus == null) {
                couponApplied = false
                console.log('couponStatusssssssNotfound', couponStatus);
                resolve(couponApplied)
            } else {
                resolve(couponApplied)
                console.log('couponStatusssssssFound', couponStatus);
            }
        })
    },

    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let Users = await db.get().collection(collection.USER_COLLECTIONS).find().toArray()
            console.log('alluserssssssssssssss', Users.length);
            resolve(Users.length);
        })
    },

    getAllAdmins: () => {
        return new Promise(async (resolve, reject) => {
            let Admin = await db.get().collection(collection.ADMIN_COLLECTIONS).find().toArray()
            console.log('alladminsssssssssssss', Admin.length);
            resolve(Admin.length);
        })
    },

    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTIONS).find().toArray()
            console.log('allProductssssssssss', products.length);
            resolve(products.length)

        })
    },

    // deleteCoupon:(couponname)=>{
    //     return new Promise(async(resolve,reject)=>{
    //         db.get().collection(collection.COUPONS_COLLECTIONS).findOne({couponcode:couponname}).then((response)=>{
    //         db.get().collection(collection.COUPONS_COLLECTIONS).deleteOne({response})
    //         })
    //         console.log('coupon iddddddddddddddddddddddddddddddd',couponname);
    //     })
    // }


}
