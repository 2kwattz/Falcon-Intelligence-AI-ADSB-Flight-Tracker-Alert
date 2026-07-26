const { Resend } = require("resend");


// DOTENV Configuration
const dotenv = require("dotenv");
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(toEmail, subject, html) {

    try {

        if (typeof html !== "string" || html.trim() === "") {
            throw new Error("sendEmail requires an HTML string. Did you forget to call your template function?");
        }

        const response = await resend.emails.send({

            from: process.env.EMAIL_FROM || "onboarding@resend.dev",
            to: toEmail,
            subject,
            html
        });

        console.log(`[*] sendEmail Triggered. ${JSON.stringify(response)}`);
        return response;

    } catch (error) {

        console.error(`[*] Error while sending email ${error.message || error}`);
        throw error;
    }
}

module.exports = sendEmail;
