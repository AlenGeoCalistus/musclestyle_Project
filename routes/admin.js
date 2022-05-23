var express = require('express');
const async = require('hbs/lib/async');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers');


let acc = 'ACCOUNT'
/* GET users listing. */
router.get('/', function (req, res, next) {
  let adminLogin = false;
  let notAdmin = true
  if (req.session.admin) {
    let admin = req.session.admin
    adminLogin = true
    console.log('ffffffffffffffffffffffffffff', admin);
    res.render('admin/admin-dashboard', { admin: true, admin, adminLogin })
  } else {
    res.render('admin/admin-dashboard', { admin: true, notAdmin })
  }


});
router.get("/admin-login", (req, res) => {
  if (req.session.admin) {
    console.log('aaaaaaaaaaaaaaaaaaaaaaa', req.session.admin);
    res.redirect('/admin')
  } else {
    adminLogin = false
    res.render('admin/admin-login', { admin: true, loginErr: req.session.adminLoginErr })
  }
})


router.post('/admin-login', async (req, res) => {

  await userHelpers.adminDoLogin(req.body).then((response) => {
    if (response.adminStatus) {

      req.session.admin = response.admin
      req.session.loggedIn = response.adminStatus;
      var logged = req.session.loggedIn
      console.log('aaaaaaaaaaaaaaaaaaaa', logged);
      console.log('aaaaaaaaaaaaaaaaaaaa', req.session.admin);
      let admin = req.session.admin
      res.redirect('/admin')
    } else {
      req.session.adminLoginErr = "Invalid Username or Password";
      res.redirect("/admin/admin-login");
    }
  })
})


router.get('/admin-signup', (req, res) => {
  res.render('admin/admin-signup')
})


router.post('/admin-signup', (req, res) => {
  let admin = 'admin'
  let adminpass = 123;
  let adminph = 8089778809;

  let name = req.body.name;
  let password = req.body.password
  let phone = req.body.phone
  // if (name.length < 4 || name.length == null || name == !NaN) {
  //   res.render('admin/admin-signup', { errname: "Enter valid name" })
  // } else if (password.length < 3) {
  //   res.render('admin/admin-signup', { errpass: "Enter valid password" })
  // } else if (phone.length < 10) {
  //   res.render("admin/admin-signup", { errphone: "Enter valid Phone Number of 10 digits !" });
  // } else {
    if(name == admin && password == adminpass && phone == adminph){
      userHelpers.adminDoSignup(req.body).then((response) => {
        console.log(response);
        req.session.admin = response
        req.session.admin = req.body
        req.session.admin.loggedIn = true
        res.redirect('/admin')
      })
    }else{
      res.redirect('/admin-signup')
    }
    
  // }

})


router.get("/admin-logout", (req, res) => {
  req.session.admin = null;
  req.session.adminLogged = false;
  let logout = 'Logged out successfully'
  res.redirect('/admin')
})

// router.get('/add-products', (req, res) => {
//   let admin = req.session.admin
// if(req.session.admin){
//   res.render('admin/add-products', { admin: true, admin})
// }else{
//   res.redirect('/admin/admin-login')
// }

// })


router.get('/admin-viewproducts', (req, res) => {
  let admin = req.session.admin;
  if (req.session.admin) {
    logged = true;
    productHelpers.getAllProducts().then((products) => {
      res.render('admin/admin-viewproducts', { admin: true, products, admin })

    })
  } else {
    res.redirect('/admin')
  }

})


router.get('/admin-editproduct/:id', async (req, res) => {
  let admin = req.session.admin;
  if (req.session.admin) {
    let product = await productHelpers.getProductDetails(req.params.id)
    console.log(product);
    res.render('admin/admin-editproduct', { product, admin })
  } else {
    res.redirect('/admin/admin-login')
  }

})


router.post('/admin-editproduct/:id', (req, res) => {
  console.log(req.params.id);
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.image) {
      let Image = req.files.image
      Image.mv("./public/product-images/" + id + ".jpg",)
    }
  })
})


router.get('/admin-deleteproduct/:id', (req, res) => {
  let prodId = req.params.id
  console.log(prodId)
  productHelpers.deleteProduct(prodId).then((response) => {
    res.redirect('/admin')
  })
})

router.get("/admin-addproduct", (req, res) => {
  let admin = req.session.admin;
  if (req.session.admin) {
    res.render("admin/admin-addproduct", { admin: true, admin });
  } else {
    res.redirect('/admin/admin-login')
  }

});


router.post("/admin-addproduct", (req, res) => {
  console.log(req.body);
  console.log(req.files.image);
  let admin = req.session.admin
  productHelpers.addProduct(req.body, (id) => {
    let Image = req.files.image;
    Image.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/admin-addproduct", { admin: true, admin });
      } else {
        console.log(err);
      }
    });
  });
});


router.get('/admin-viewusers', (req, res) => {
  let admin = req.session.admin
  if (req.session.admin) {
    productHelpers.getAllUsers().then((Users) => {
      // console.log("ffdfsdfdf", Users);
      res.render("admin/admin-viewusers", { admin: true, Users, admin });
    })
  } else {
    res.redirect('/admin/admin-login')
  }
})


router.get('/admin-edituser/:id', async (req, res) => {
  let admin = req.session.admin
  if (req.session.admin) {
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa', req.params.id);
    let user = await productHelpers.getUserDetails(req.params.id)
    res.render('admin/admin-edituser', { admin, login: true, user })
  } else {
    res.redirect('/admin/admin-login')
  }

})


router.post('/admin-edituser/:id', (req, res) => {
  productHelpers.updateUser(req.params.id, req.body).then(() => {
    res.redirect('/admin/admin-viewusers')
  })
})


router.get('/admin-deleteuser/:id', (req, res) => {
  let userId = req.params.id
  console.log(userId)
  productHelpers.deleteUser(userId).then((response) => {
    res.redirect('/admin/admin-viewusers')
  })
})


router.get("/admin-adduser", (req, res) => {
  let admin = req.session.user
  if (req.session.admin) {
    res.render("admin/admin-adduser", { admin, login: true });
  } else {
    res.redirect('/admin/admin-login')
  }
});

router.post("/admin-adduser", (req, res) => {
  console.log(req.body);

  productHelpers.addUser(req.body, (id) => {
    res.redirect("/admin/admin-adduser");
  });

})

router.get('/admin-blockuser', (req, res) => {
  let admin = req.session.admin
  if (req.session.admin) {
    console.log('aaaaaaaaaaaaaaaa', req.session.admin);
    productHelpers.getAllUsers().then((Users) => {
      // console.log("ffdfsdfdf", Users);
      res.render("admin/admin-blockuser", { admin: true, Users, admin });
    })
  } else {
    res.redirect('/admin/admin-login')
  }
})

router.get('/admin-blockeduser/:id', (req, res) => {
  let userId = req.params.id
  userHelpers.blockUsers(userId).then((response) => {
    res.redirect('/admin/admin-view-blockedusers')
  })

})


router.get('/admin-view-blockedusers', (req, res) => {
  let admin = req.session.admin
  if (req.session.admin) {
    productHelpers.getBlockedUsers().then((blockedUsers) => {
      // console.log("ffdfsdfdf", blockedUsers);
      res.render("admin/admin-view-blockedusers", { admin, login: true, blockedUsers });
    })
  }
})

router.get('/admin-unblockuser/:id', (req, res) => {
  let userId = req.params.id
  userHelpers.unblockUsers(userId).then((response) => {
    res.redirect('/admin/admin-viewusers')
  })

})


router.get('/admin-view-userorders', (req, res) => {
  let admin = req.session.admin
  if (req.session.admin) {
    productHelpers.getAllOrders().then((orders) => {
      // console.log("ffdfsdfdf", orders);
      res.render("admin/admin-view-userorders", { admin: true, orders, admin });
    })
  } else {
    res.redirect('/admin/admin-login')
  }
})


router.get('/modifyOrders/:id', async (req, res) => {
  if (req.session.admin) {
    let modifyOrders = await userHelpers.modifyOrders(req.params.id)
    console.log('modifyOrderssssssadminnnnnnn', modifyOrders);
    res.render('admin/modifyOrders', { admin: req.session.admin, modifyOrders })
  } else {
    res.redirect('/admin/admin-login')
  }
})


router.post('/modifyOrders/', (req, res) => {
  if (req.session.admin) {
    userHelpers.modifiedOrders(req.body).then(() => {
      res.redirect('/admin/admin-view-userorders')
    })
  } else {
    res.redirect('/admin/admin-login')
  }
})


//! sales report testing not success
router.get('/salesReport', (req, res) => {
  res.render('admin/aasalesReport', { admin: req.session.admin })
})

//new tetst

// let today = new Date();
// today.setHours(0, 0, 0, 0)
// let first = today.getDate() - today.getDay();
// let last = first + 6;
// let firstday = new Date(today.setDate(first))
// let lastday = new Date(today.setDate(last)).toUTCString();
// let firstDayMonth = new Date(today.setDate(1));
// let lastDayMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
// lastDayMonth.setHours(23, 59, 59, 0);
// today = new Date().setHours(0, 0, 0, 0);

const DAY_SECONDS = 1 * 24 * 60 * 60 * 1000;
const WEEK_SECONDS = 7 * 24 * 60 * 60 * 1000;
const MONTH_SECONDS = 30 * 24 * 60 * 60 * 1000;
const YEAR_SECONDS = 365.25 * 24 * 60 * 60 * 1000;

let nowDate = new Date();
const day_seconds = 1 * 24 * 60 * 60 *1000;
let today = new Date(nowDate - day_seconds)
console.log('daysecondsssssssssssssssssssssss',today);

router.get('/dashboard', async (req, res) => {

  //* user, admins and products count

  let usersCount = await userHelpers.getAllUsers()
  console.log('allUsers', usersCount);

  let adminCount = await userHelpers.getAllAdmins()
  console.log('allAdmins', adminCount);

  let productsCount = await userHelpers.getAllProducts()
  console.log('allProducts', productsCount);

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);

  //* date variables for filtering
  
  let nowDate = new Date();
  let lastWeek = new Date(nowDate - WEEK_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  let today = new Date(nowDate - day_seconds)
  console.log('lastweekkkkkkkkkkkkkkkkkk', lastWeek);
  console.log('todaynewwwwwwwwwwwww',today);
  // LAST WEEK SALE COUNT
  let response = await userHelpers.getWeekReport(lastWeek)
  report = response
  weekReport = true
  let lastWeekcount = report.length
  // LAST WEEK SALE AMOUNT
  let lastWeekTotalAmt = await userHelpers.getWeekTotal(lastWeek)
  // TODAY SALE COUNT
  let todaySale = await userHelpers.getTodaySaleCount(today)
  let todaySaleCount = todaySale.length
  // TODAY SALE AMOUNT
  let todayTotalAmt = 0;
  todayTotalAmt = await userHelpers.getTotalSale(Today)
  if (todayTotalAmt == 0) {
    todayTotalAmt = 0;
  }
  console.log('todaysaleeeeeeeee', todayTotalAmt);
  res.render('admin/dashboard', { admin: req.session.admin, report, weekReport, lastWeekcount, lastWeekTotalAmt, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, weeklyReport: true, usersCount, adminCount, productsCount })

})


router.get('/month-report', async (req, res) => {

  //* user, admins and products count

  let usersCount = await userHelpers.getAllUsers()
  console.log('allUsers', usersCount);

  let adminCount = await userHelpers.getAllAdmins()
  console.log('allAdmins', adminCount);

  let productsCount = await userHelpers.getAllProducts()
  console.log('allProducts', productsCount);

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);
  let nowDate = new Date()
  let lastMonth = new Date(nowDate - MONTH_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  console.log('lastmonthhhhhhhhhhh', lastMonth);
  let response = await userHelpers.getMonthReport(lastMonth)
  console.log('loggggggggggggggggggg', response);
  let lastMthCount = response.length
  console.log('lastmonthcountttttt', lastMthCount);
  // monthReport = true
  let lastMonthSale = await userHelpers.getMonthTotal(lastMonth)
  console.log('lastmonthtotalSale', lastMonthSale);
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  let todayTotalAmt = await userHelpers.getTotalSale(Today)
  res.render('admin/dashboard', { admin: req.session.admin, response, lastMthCount, lastMonthSale, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, monthlyReport: true, usersCount, adminCount, productsCount })

})


router.get('/year-report', async (req, res) => {

  //* user, admins and products count

  let usersCount = await userHelpers.getAllUsers()
  console.log('allUsers', usersCount);

  let adminCount = await userHelpers.getAllAdmins()
  console.log('allAdmins', adminCount);

  let productsCount = await userHelpers.getAllProducts()
  console.log('allProducts', productsCount);

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);
  let nowDate = new Date()
  let lastYear = new Date(nowDate - YEAR_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  let response = await userHelpers.getYearReport(lastYear)
  let lastYearCount = response.length
  yearReport = true
  let lastYearSale = await userHelpers.getYearTotal(lastYear)
  console.log('lastyearrrrrrrrr', lastYearSale);
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  let todayTotalAmt = await userHelpers.getTotalSale(Today)
  res.render('admin/dashboard', { admin: req.session.admin, response, lastYearCount, lastYearSale, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, yearlyReport: true, usersCount, adminCount, productsCount })
})


router.get('/add_coupons', (req, res) => {
  if (req.session.admin) {
    res.render('admin/add_coupons', { admin: req.session.admin })
  } else {
    res.redirect('/admin/admin-login')
  }

})

router.post('/add_coupons', (req, res) => {
  console.log('couponsssssssssssssssss', req.body);
  userHelpers.addCoupons(req.body).then(() => {
    res.redirect('/admin/add_coupons')
  })
})

router.get('/view_coupons', (req, res) => {
  productHelpers.viewCoupons().then((allCoupons) => {
    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaaaaa', allCoupons)
    res.render('admin/view_coupons', { admin: req.session.admin, allCoupons })
  })
})

router.get('/deletecoupon/:id', (req, res) => {
  let coupId = req.params.id
  console.log(coupId)
  productHelpers.deleteCoupon(coupId).then((response) => {
    res.redirect('/admin')
  })
})


router.get('/week-report', async (req, res) => {
  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);

  //* date variables for filtering
  let nowDate = new Date();
  let lastWeek = new Date(nowDate - WEEK_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  console.log('lastweekkkkkkkkkkkkkkkkkk', lastWeek);
  // LAST WEEK SALE COUNT
  let response = await userHelpers.getWeekReport(lastWeek)
  report = response
  weekReport = true
  let lastWeekcount = report.length
  // LAST WEEK SALE AMOUNT
  let lastWeekTotalAmt = await userHelpers.getWeekTotal(lastWeek)
  // TODAY SALE COUNT
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  // TODAY SALE AMOUNT
  let todayTotalAmt = 0;
  todayTotalAmt = await userHelpers.getTotalSale(Today)
  if (todayTotalAmt == 0) {
    todayTotalAmt = 0;
  }
  console.log('todaysaleeeeeeeee', todayTotalAmt);
  res.render('admin/dashboard', { admin: req.session.admin, report, weekReport, lastWeekcount, lastWeekTotalAmt, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, weeklyReport: true })
})

router.get('/weekly_report', async (req, res) => {

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);

  //* date variables for filtering
  let nowDate = new Date();
  let lastWeek = new Date(nowDate - WEEK_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  console.log('lastweekkkkkkkkkkkkkkkkkk', lastWeek);
  // LAST WEEK SALE COUNT
  let response = await userHelpers.getWeekReport(lastWeek)
  report = response
  weekReport = true
  let lastWeekcount = report.length
  // LAST WEEK SALE AMOUNT
  let lastWeekTotalAmt = await userHelpers.getWeekTotal(lastWeek)
  // TODAY SALE COUNT
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  // TODAY SALE AMOUNT
  let todayTotalAmt = 0;
  todayTotalAmt = await userHelpers.getTotalSale(Today)
  if (todayTotalAmt == 0) {
    todayTotalAmt = 0;
  }
  console.log('todaysaleeeeeeeee', todayTotalAmt);
  res.render('admin/weekSalesReport', { admin: req.session.admin, report, weekReport, lastWeekcount, lastWeekTotalAmt, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, weeklyReport: true })

})


router.get('/monthly_report', async (req, res) => {

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);
  let nowDate = new Date()
  let lastMonth = new Date(nowDate - MONTH_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  console.log('lastmonthhhhhhhhhhh', lastMonth);
  let response = await userHelpers.getMonthReport(lastMonth)
  console.log('loggggggggggggggggggg', response);
  let lastMthCount = response.length
  console.log('lastmonthcountttttt', lastMthCount);
  // monthReport = true
  let lastMonthSale = await userHelpers.getMonthTotal(lastMonth)
  console.log('lastmonthtotalSale', lastMonthSale);
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  let todayTotalAmt = await userHelpers.getTotalSale(Today)
  res.render('admin/monthSalesReport', { admin: req.session.admin, response, lastMthCount, lastMonthSale, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, monthlyReport: true })

})


router.get('/yearly_report', async (req, res) => {

  //* payment method count
  let razorpay = await userHelpers.getRazorpayCount()
  console.log('razorpaylengthhhhhh', razorpay);

  let COD = await userHelpers.getCODcount()
  console.log('coddddddddddddd', COD);

  let paypal = await userHelpers.getPaypalCount()
  console.log('paypalllllllll', paypal);

  //* payment method totalAmount
  let razorpayAmt = await userHelpers.getRazorpayAmt()
  console.log('totalrazorpayyyyyyyyyy', razorpayAmt);

  let CODamt = await userHelpers.getCODAmt()
  console.log('totalCOdddddddddddd', CODamt);

  let paypalAmt = await userHelpers.getPaypalAmt()
  console.log('totalPaypallllll', paypalAmt);
  let nowDate = new Date()
  let lastYear = new Date(nowDate - YEAR_SECONDS)
  let Today = new Date(nowDate - DAY_SECONDS)
  let response = await userHelpers.getYearReport(lastYear)
  let lastYearCount = response.length
  yearReport = true
  let lastYearSale = await userHelpers.getYearTotal(lastYear)
  console.log('lastyearrrrrrrrr', lastYearSale);
  let todaySale = await userHelpers.getTodaySaleCount(Today)
  let todaySaleCount = todaySale.length
  let todayTotalAmt = await userHelpers.getTotalSale(Today)
  res.render('admin/yearSalesReport', { admin: req.session.admin, response, lastYearCount, lastYearSale, todaySaleCount, todayTotalAmt, razorpay, COD, paypal, razorpayAmt, CODamt, paypalAmt, yearlyReport: true })
})
module.exports = router; 
