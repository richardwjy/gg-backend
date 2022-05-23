const nodemailer = require('nodemailer');

const getMessageByType = (type, url) => {
    let msg;
    switch (type) {
        case "Register User":
            msg = `<p>Please ignore this email if you never register to our web page!</p>
        
                    <p>Verify your account by clicking this attached link here: <a href=${url}>Verify your account</a>
                    This link is only alive for 20 minutes!</p>
                `
            break;
        case "Forget Password":
            msg = `<p>Please ignore this email if you never requested to change password!</p>
        
                    <p>Reset your password by clicking this attached link here: <a href=${url}>Reset your password</a>
                    This link is only alive for 20 minutes!</p>
                `
            break;
    }
    return msg;
}

const sendEmail = (emailaddress, token, type) => {
    const url = `http://${process.env.HOST}:8000/v1/api/auth/verify-user/${token}`
    const message = getMessageByType(type, url);
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_ACC,
            pass: process.env.EMAIL_PASS
        }
    })
    const mailOptions = {
        from: process.env.EMAIL_ACC,
        to: emailaddress,
        subject: `Training GG - ${type}`,
        html: message
    }
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error(err)
            // throw new Error(`Error while sending email: ${err.message}`)
        } else {
            console.log(info.response)
        }
    })
}

module.exports = sendEmail;