import sendgrid from '@sendgrid/mail';
import * as dotenv from 'dotenv';
dotenv.config();

sendgrid.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export default async function sendEmail(
	email: string,
	subject: string,
	bodyHtml?: string,
	bodyText?: string
) {
	const emailHtml = bodyHtml ?? bodyText ?? "";
	
	const options = {
	  from: process.env.FROM_EMAIL ?? "",
	  to: email,
	  subject: subject,
	  html: emailHtml,
	};

	sendgrid.send(options).then(() => {
		console.log('Email sent')
	})
	.catch((error) => {
		console.error(error)
	})

}

