const Router = require('express').Router();

const authRoute = require('./auth');
const invoiceRoute = require('./invoice');

Router.use('/auth', authRoute);
Router.use('/invoice', invoiceRoute);

module.exports = Router;