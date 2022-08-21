import type { Address, AttachmentLike } from 'nodemailer/lib/mailer'
import type { Readable } from 'nodemailer/lib/xoauth2'
import nodemailer = require('nodemailer')

type MailAddress = string | Address | Array<string | Address> | undefined
type MailData = string | Buffer | Readable | AttachmentLike | undefined

class Mailer {
  private static transporter: nodemailer.Transporter
  constructor(transporter: nodemailer.Transporter) {
    if (!Mailer.transporter) Mailer.transporter = transporter
  }

  async send(mail: IMail) {
    return Mailer.transporter.sendMail(mail.get())
  }
}

export declare interface IMail {
  to(address: MailAddress): Mail
  subject(data: string | undefined): Mail
  text(data: MailData): Mail
  html(data: MailData): Mail

  get(): nodemailer.SendMailOptions
}

export class Mail implements IMail {
  private mail: nodemailer.SendMailOptions = {}
  constructor(completeMail?: nodemailer.SendMailOptions) {
    if (completeMail) Object.assign(this, completeMail)
  }

  to(address: MailAddress) {
    this.mail.to = address
    return this
  }

  subject(value: string) {
    this.mail.subject = value
    return this
  }

  text(value: MailData) {
    this.mail.text = value
    return this
  }

  html(value: MailData) {
    this.mail.html = value
    return this
  }

  public get(): nodemailer.SendMailOptions {
    return this.mail
  }
}

export const SMTP = new Mailer(
  nodemailer.createTransport(
    {
      service: 'Mail.ru',
      auth: {
        user: 'appm.up@matchup.space',
        pass: 'iO(GOUtuyt21',
      },
    },
    {
      from: 'MatchUp <appm.up@matchup.space>',
    },
  ),
)
