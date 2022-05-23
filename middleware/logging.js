module.exports = (req, res, next) => {
    console.log(`Richard log: ${req.url}`);
    next();
}