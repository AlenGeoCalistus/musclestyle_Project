
const e = require('express');
const { response } = require('express');
var express = require('express');
const async = require('hbs/lib/async');
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const paypal = require('paypal-rest-sdk')

//! Twilio token

const serviceSID = "VAe360f1f818d6a4c82731988460a5667e";
const accountSID = "AC98e8fdb20e3bc4f2a7fddb7f67775da7";
const authToken = "cc181656d85d08e33082770d8e690969";
const client = require("twilio")(accountSID, authToken);

// const client = require('twilio')(process.env.accountSID,process.env.authToken);mongo


const verifyLogin = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/user-login");
  }
};

let myCouponDiscount;
let myCouponApplied = false;

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user;
  let notUser = true
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);

    productHelpers.getAllProducts().then((products) => {
      console.log(user);
      res.render("user/user-dashboard", { products, user, cartCount });
    });
  } else {
    res.render("user/user-dashboard", { notUser });
  }
});



router.get('/detailed-view', (req, res) => {
  let user = req.session.user
  let notUser = true
  if (req.session) {
    productHelpers.getAllProducts().then((products) => {
      res.render("user/detailed-view", { products, user });
    });
  } else {
    productHelpers.getAllProducts().then((products) => {
      res.render("user/detailed-view", { products, notUser });
    });
  }

})

router.get('/user-signup', (req, res) => {
  res.render('user/user-signup')
})

router.post('/user-signup', (req, res) => {
  let name = req.body.name;
  let password = req.body.password;
  let phone = req.body.phone;
  if (name.length < 4 || name.length == null || name == !NaN || name == Number(name)) {
    res.render("user/user-signup", { errname: "Invalid Name !" });
  } else if (password.length < 3) {
    res.render("user/user-signup", { errpass: "Enter password more than 3 characters !" });
  } else if (phone.length < 10 || phone.length > 10) {
    res.render("user/user-signup", { errphone: "Enter valid Phone Number of 10 digits !" });
  } else {
    userHelpers.doSignup(req.body).then((response) => {
      console.log(response);
      req.session.user = response;
      req.session.user = req.body;
      req.session.user.loggedIn = true;
      res.redirect("/");
    });
  }
})



router.get('/user-login',async (req, res) => {
  if (req.session.user) {
    res.redirect("/");
  } else {
    res.render("user/user-login", { loginErr: req.session.userLoginErr, passChange: req.session.userPasschange });
    req.session.userLoginErr = false;
  }
});




// ! NORMAL LOGIN CODE

router.post('/user-login', async (req, res) => {
  console.log('userloginbody',req.body);
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.loggedIn = true;
      res.redirect("/");
    } else {
      req.session.userLoginErr = "Invalid Username or Password";
      res.redirect("/user-login");
    }
  });
})


router.get("/user-logout", (req, res) => {
  req.session.user = null;
  req.session.loggedIn = false;
  res.redirect("/");
});

//! cart original
router.get("/user-cart", verifyLogin, async (req, res) => {
  let users;
  let myCouponStatus = await userHelpers.couponStatusCheck(req.session.user._id)
  console.log('couponStatusssssssssss',myCouponStatus);
  
  let products = await userHelpers.getCartProducts(req.session.user._id);
  let cartTotal = 0;
  user = req.session.user
  if (products.length > 0) {
    cartTotal = await userHelpers.getTotalAmount(req.session.user._id);
  }
  console.log(products);
  res.render("user/user-cart", { products, user: req.session.user._id, cartTotal, user,myCouponStatus });
});


router.get("/add-to-cart/:id", verifyLogin,async (req, res) => {
  console.log("called");
  //! note to delete thhis
  // let myCouponStatus = await userHelpers.couponStatusCheck(req.session.user._id)
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.redirect("/detailed-view");
    //! note this res.json
    // res.json({ status: true });
  });
});

router.post('/change-product-quantity', (req, res) => {
  console.log('fffffffffffffffffffffffffffffffff', req.body)
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})


router.post('/removeCartProduct', (req, res) => {
  console.log('fffffffffffffffffffffffffffffffff', req.body)
  userHelpers.removeProduct(req.body).then((response) => {
    res.json(response)
  })
})


router.get('/image-zoom/:id', verifyLogin, async (req, res) => {
  let user = req.session.user
  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render("user/image-zoom", { product, user })
})


// TODO: OTP LOGIN CODE 
router.get('/OTP_login',(req,res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/OTP_login')
  }
})
// TODO: OTP LOGIN CODE 

router.post("/OTP_login", (req, res) => {
  console.info(req.body);
  userHelpers.doOtpLogin(req.body).then((response) => {
    if (response.status) {
      req.session.number = req.body.phone
      client.verify
        .services(process.env.serviceSID)
        .verifications.create({
          to: `+91${req.body.phone}`, 
          channel: "sms",
        }).then(() => {
          res.render("user/enter-OTP");
        });

    } else {
      req.session.userLoginErr = "Invalid Username or Password";
      res.redirect("/OTP_login");
    }
  });
});


// TODO: VERIFY OTP CODE

router.post("/verify-OTP", function (req, res) {
  let OTP_CODE = req.body.OTP_CODE;

  client.verify
    .services(process.env.serviceSID)
    .verificationChecks.create({
      to: `+91${req.session.number}`,
      code: OTP_CODE,
    })
    .then((response) => {
      console.log("qqqqqqqqqqqqqqqqqqqqqqqqqqqqr",response);
      if (response.valid) {
        console.log("wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww",req.session.number);
        userHelpers
          .getUserdetailsWithMobile(req.session.number)
          .then((details) => {
            if (details.blockStatus == false || details.blockStatus == null) {
              req.session.user = details[0];
              req.session.loggedIn = true;

              res.redirect("/");
            } else {
              req.session.loginErrr = "User is Blocked";
              res.redirect("/OTP_login");
            }

          });
      }else{
        res.send("OTP not matching")
      }
    });
});

// TODO: OTP LOGIN CODE END

router.get('/mergeProfile', async (req, res) => {
  if (req.session.user) {
    await userHelpers.getUsername(req.session.user._id).then((user) => {
      res.render('user/mergeProfile', { user })
    })
  }
})


router.get('/user-editProfile/:id', async (req, res) => {
  let user = await productHelpers.getUserDetails(req.params.id)
  console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa', user);
  res.render('user/user-editProfile', { user })

})

//! edit profile original
// router.post('/user-editProfile/:id', (req, res) => {
//   console.log('userpropic',req.files);
//   userHelpers.updateUserProfile(req.params.id, req.body,req.files).then(() => {
//     res.redirect('/user-profile')
//   }) 
// })
//! edit profile original end


//! EDIT PROFILE MODIFIED
router.post('/user-editProfile/:id', (req, res) => {
  // console.log(req.params.id);
  profilePic = false;
  let id = req.params.id;
  userHelpers.updateUserProfile(req.params.id, req.body).then(() => {
    res.redirect('/mergeProfile')
    if (req.files.image) {
      let proPic = req.files.image
      proPic.mv("./public/user-profilePic/" + id + ".jpg",)
    }
  })
})
//! EDIT PROFILE MODIFIED END

router.get('/user-buynow', verifyLogin, async (req, res) => {

  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  discount = discount / 100
  console.log('discounttttttttttttt', discount);
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let finalAmt = total - discount
  if (req.session.myCouponDiscount) {
    grandtotal = finalAmt - myCouponDiscount
    couponStatus = true
    console.log('apply coupon', grandtotal);
    res.render('user/user-buynow', { total, discount, grandtotal, finalAmt, user: req.session.user, couponStatus, myCouponDiscount })

  }
  res.render('user/user-buynow', { total, discount, finalAmt, user: req.session.user, myCouponDiscount })
})


router.post('/user-buynow', async (req, res) => {

  let products = await userHelpers.getCartProductList(req.body.userId)
  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  discount = discount / 100
  let totalAmount = await userHelpers.getTotalAmount(req.body.userId)
  let finalAmt = totalAmount - discount
  if (req.session.myCouponDiscount) {
    let grandtotal = finalAmt - myCouponDiscount
    userHelpers.placeOrder(req.body, products, grandtotal).then(async (orderId) => {
      if (req.body['payment-method'] === 'COD') {
        console.log('mycoupennnnnnnnnnnnnn', req.session.myCouponDiscount);
        await userHelpers.couponAdded(req.session.user._id)

        req.session.myCouponDiscount
          = null;
        res.json({ codSuccess: true })

      } else {
        userHelpers.generateRazorpay(orderId, grandtotal).then((response) => {
          req.session.myCouponDiscount = null
          console.log('req.ession.couponnnnnnnnnn', req.session.coupon);
          res.json(response);
        })
      }
    })
  } else {
    userHelpers.placeOrder(req.body, products, finalAmt).then((orderId) => {
      if (req.body['payment-method'] === 'COD') {
        res.json({ codSuccess: true })
      } else {
        userHelpers.generateRazorpay(orderId, finalAmt).then((response) => {
          res.json(response);
        })
      }
    })
  }
})


router.get('/paypal_checkout', verifyLogin, async (req, res) => {
  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  discount = discount / 100
  console.log('discounttttttttttttt', discount);
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let finalAmt = total - discount
  if (req.session.myCouponDiscount) {
    couponStatus = true;
    grandtotal = finalAmt - myCouponDiscount
    res.render('user/paypal_checkout', { total, discount, finalAmt, grandtotal, user: req.session.user, couponStatus, myCouponDiscount })
  } else {
    console.log('discounttttttttttttt', finalAmt);
    res.render('user/paypal_checkout', { total, discount, finalAmt, user: req.session.user })
  }
})


router.post('/paypal_checkout', async (req, res) => {
  console.log('paypallllllllllllllllllll', req.body);
  let products = await userHelpers.getCartProductList(req.body.userId)
  let discount = await userHelpers.getTotalDiscount(req.session.user._id)
  discount = discount / 100
  let totalAmount = await userHelpers.getTotalAmount(req.body.userId)
  let finalAmt = totalAmount - discount
  userHelpers.placeOrderPaypal(req.body, products, finalAmt).then((orderId) => {
    if (req.session.user) {
      req.session.amount = finalAmt
      req.session.orderId = orderId
    }
    userHelpers.generatePaypal(orderId, finalAmt).then((response) => {
      console.log('userresponseeeeeeeeeeeeeeeeeeee', response);
      paypal.payment.create(response, function (error, payment) {
        if (error) {
          console.log(error);
        } else {
          console.log('orderrrrrrrrPaypallllllllllllllll', payment);
          for (let i = 0; i < payment.links.length; i++) {
            if (payment.links[i].rel === 'approval_url') {
              res.redirect(payment.links[i].href);
            }
          }
        }
      });
    })
  })
})

router.get('/success', (req, res) => {
  console.log('reqbodyyyyyyyyyyy', req.query);
  console.log('req.session.amounttttttttttt', req.session.amount);
  const payerId = req.query.PayerID;
  const paymentId = req.query.paymentId;
  let amount = req.session.amount



  const execute_payment_json = {
    "payer_id": payerId,
    "transactions": [{
      "amount": {
        "currency": "USD",
        "total": amount
      }
    }]
  };

  paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
    console.log('rewq.session.order.id', req.session.orderId);
    if (error) {
      console.log(error.response);
      throw error;
    } else {
      console.log('booooooooooooooooooooooooooo', payment);
      console.log(JSON.stringify(payment));
      userHelpers.changePaymentStatus(req.session.orderId).then(() => {
        res.redirect('/order-placed');
      })

    }
  });
});
router.get('/cancel', (req, res) => res.redirect('/'));


router.get('/order-placed', (req, res) => {
  res.render('user/order-placed', { user: req.session.user })
})


router.get('/view-orders', async (req, res) => {
  if (req.session.user) {
    let orders = await userHelpers.getUserOrders(req.session.user._id)
    res.render('user/view-orders', { user: req.session.user, orders })
  } else {
    res.redirect('/user-login')
  }
})


router.get('/cancel-order/:id', async (req, res) => {
  await userHelpers.cancelOrders(req.params.id).then((response) => {
    console.log('usercancelorderResponse', response);
    if (response) {
      orderCancelled = "Order Has Been Cancelled !"
      res.redirect('/view-orders')
    } else {
      res.redirect('/user-login')
    }

  })
})


router.get('/view-cancelledOrders', async (req, res) => {
  if (req.session.user) {
    let cancelledOrders = await userHelpers.cancelledOrders(req.session.user._id)
    console.log('cancelledOrdersssSSSSSSSSSSSSSSSSSSSSS', cancelledOrders);
    res.render('user/view-cancelledOrders', { user: req.session.user, cancelledOrders })
  } else {
    res.redirect('/user-login')
  }
})


router.get('/view-ordered-products/:id', async (req, res) => {
  let products = await userHelpers.getCancelledProducts(req.params.id)
  res.render('user/view-cancelled-products', { user: req.session.user, products })
})


router.get('/view-ordered-products/:id', async (req, res) => {
  let products = await userHelpers.getOrderedProducts(req.params.id)
  res.render('user/view-ordered-products', { user: req.session.user, products })
})


router.post('/verify-payment', (req, res) => {
  console.log('verifypayyyyyyyyyyyyyyyyyyy', req.body);
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('Payment Success');
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false })
  })
})

//! Check before removing
// router.get('/view-orders', async (req, res) => {
//   let orders = await userHelpers.getUserOrders(req.session.user._id)
//   res.render('user/view-orders', { user: req.session.user, orders })
// })


router.get('/addnew-address', verifyLogin, (req, res) => {
  if (req.session.user) {
    res.render('user/addnew-address', { user: req.session.user })
  } else {
    res.redirect('/user-login')
  }
})


router.post('/addnew-address', async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  userHelpers.addNewAddress(req.body, req.session.user._id).then((newaddress) => {
    console.log('ccccccccccccccccccccccc', newaddress.name);
    res.render('user/user-buynow-newAddress', { total, user: req.session.user, newaddress })
  })
})


router.get('/changeAddress', async (req, res) => {
  if (req.session.user) {
    let allAddress = await userHelpers.getAllAddress(req.session.user._id)
    res.render('user/changeAddress', { user: req.session.user, allAddress })
  }

})

router.get('/changed-address/:id', async (req, res) => {
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let oneAddress = await userHelpers.getChangedAddress(req.params.id)
  res.render('user/changed-address', { user: req.session.user, oneAddress, total })
})


router.get('/update-password', verifyLogin, (req, res) => {
  res.render('user/update-password', { user: req.session.user })
})


router.post('/update-password', (req, res) => {
  userHelpers.updatePass(req.body).then((status) => {
    console.log('response', status);
    if (status) {
      req.session.user = null;
      req.session.userPasschange = "Password Changed Successfully";
      res.redirect('/user-login')
    }

  })
})

router.get('/update-passwordOTP', (req, res) => {
  res.render('user/update-passwordOTP', { user: req.session.user })
})

router.get('/applyCoupons', async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id);
  myCouponDiscount = await userHelpers.searchMyCoupon(req.session.user);
  console.log('discountvalueeeeeeeee', myCouponDiscount);
  req.session.myCouponDiscount = myCouponDiscount
  req.session.myCouponApplied = true;
  let cartTotal = 0;
  user = req.session.user
  cartTotal = await userHelpers.getTotalAmount(req.session.user._id);
  res.render("user/coupon_cart", { products, user: req.session.user._id, cartTotal, user, myCouponDiscount, couponStatus: true });



})




module.exports = router;
