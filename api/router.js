const Router = require('express').Router();

const usersRoute = require('./users');
const authRoute = require('./auth');
const invoiceRoute = require('./approval');
const invoiceType = require('./invoiceType');

Router.use('/users', usersRoute);
Router.use('/auth', authRoute);
Router.use('/invoice', invoiceRoute);
Router.use('/invoice-type', invoiceType);

module.exports = Router;