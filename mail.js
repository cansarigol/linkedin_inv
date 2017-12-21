const nodemailer = require('nodemailer');
module.exports = {
    SendMail : function (message){
        let transporter = nodemailer.createTransport({
            host: 'smtp.webfaction.com',
            port: 465,
            secure: true,
            auth: {
                user: 'user',
                pass: 'pass'
            }
        });

        // setup email data with unicode symbols
        let mailOptions = {
            from: '"Linkedin Inv 👻" <mail@mail.com>', 
            to: 'mail@mail.com,',
            subject: 'Test', 
            text: message,
            //html: '<b>Hello world ?</b>' // html body
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return console.log(error);
            }
            console.log('Message %s sent: %s', info.messageId, info.response);
        });
    }
};