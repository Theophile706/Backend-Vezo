import 'dotenv/config'
import { createApp } from './app.js'
import { createResendMailer } from './mailer.js'

const missing = ['RESEND_API_KEY', 'MAIL_FROM', 'MAIL_TO'].filter((name) => !process.env[name])
if (missing.length > 0) {
  console.error(`Variables d’environnement manquantes : ${missing.join(', ')}`)
  process.exit(1)
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const app = createApp({
  mailer: createResendMailer(process.env.RESEND_API_KEY),
  mailFrom: `"Le Vezo Beach Morondava" <${process.env.MAIL_FROM}>`,
  mailTo: process.env.MAIL_TO,
  corsOrigins,
})

const port = Number(process.env.PORT) || 4100
app.listen(port, () => {
  console.log(`API des demandes démarrée sur le port ${port}`)
})
