import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export const createSmtpTransporter = async (): Promise<Transporter> => {
  if (transporter) {
    return transporter;
  }

  const account = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass,
    },
  });

  console.log("Ethereal SMTP transporter created");

  return transporter;
};

export const sendEmail = async (
  from: string,
  to: string,
  subject: string,
  text: string
): Promise<{ messageId: string; previewUrl: string | false }> => {
  const mailer = await createSmtpTransporter();

  const info = await mailer.sendMail({
    from,
    to,
    subject,
    text,
  });

  return {
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info),
  };
};