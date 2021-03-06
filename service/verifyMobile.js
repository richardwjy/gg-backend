const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header("Authorization").split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Authentication Required" })
    }
    try {
        const user = jwt.verify(token, process.env.MOBILE_PRIVATE_KEY);
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Token Expired" })
    }

    // Untuk development, silahkan comment code diatas dan uncomment code dibawah
    // req.user = { USERNAME: "Testing by Developer" };
    // next();
}