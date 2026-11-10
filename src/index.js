import 'dotenv/config'
import nodemailer from 'nodemailer'
import { createApp } from './app.js'

const missing = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'MAIL_TO'].filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`Variables d’environnement manquantes : ${missing.join(', ')}`)
  process.exit(1)
}

const gmailUser = process.env.GMAIL_USER
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: gmailUser,
    pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ''),
  },
})

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = createApp({
  mailer: transporter,
  mailFrom: `"Le Vezo Beach Morondava" <${gmailUser}>`,
  mailTo: process.env.MAIL_TO,
  corsOrigins,
})

const port = Number(process.env.PORT) || 4100
app.listen(port, () => {
  console.log(`API des demandes démarrée sur le port ${port}`)
})
