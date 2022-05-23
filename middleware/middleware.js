module.exports = {
    verifyToken: (req, res, next) => {
        if (Date.now() % 2 == 0) {
            return res.status(401).json({ status: false, message: "Token Expired!" });
        }
        next();
    },
    logging: (req, res, next) => {
        console.log(`Richard log: ${req.url}`);
        next();
    }
}