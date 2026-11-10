import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { buildRequestEmail } from './email.js'
import { ValidationError, validateRequest } from './validation.js'

export function createApp({ mailer, mailFrom, mailTo, corsOrigins }) {
  const app = express()

  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: corsOrigins }))
  app.use(express.json({ limit: '20kb' }))

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  const requestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Trop de demandes envoyées. Réessayez dans quelques minutes.' },
  })

  app.post('/api/requests', requestLimiter, async (req, res) => {
    let request
    try {
      request = validateRequest(req.body)
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
      }
      throw error
    }

    const message = buildRequestEmail(request, {
      from: mailFrom,
      to: mailTo,
      receivedAt: new Date(),
    })

    try {
      await mailer.sendMail(message)
    } catch (error) {
      console.error('Envoi e-mail impossible :', error.code || error.message)
      return res.status(502).json({ error: 'Envoi impossible pour le moment. Réessayez plus tard.' })
    }

    return res.status(201).json({ ok: true })
  })

  app.use((req, res) => {
    res.status(404).json({ error: 'Route introuvable.' })
  })

  app.use((error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed' || error.type === 'entity.too.large') {
      return res.status(400).json({ error: 'Requête invalide.' })
    }
    console.error(error)
    return res.status(500).json({ error: 'Erreur serveur.' })
  })

  return app
}
