const nodemailer = require('nodemailer')

class Mailer {
  static transporter
  constructor(transporter) {
    if (transporter)
      this.transporter = nodemailer.createTransport(
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
      )
    else this.transporter = transporter
  }

  async send(mail) {
    return this.transporter.sendMail(mail)
  }
}

class Mail {
  constructor(completeMail) {
    if (completeMail) Object.assign(this, completeMail)
  }

  to(address) {
    this.to = address
    return this
  }

  subject(value) {
    this.subject = value
    return this
  }

  text(value) {
    this.text = value
    return this
  }

  html(value) {
    this.hmtl = value
    return this
  }

  get() {
    return this.mail
  }
}

module.exports.Mailer = new Mailer()

module.exports.Mail = Mail
