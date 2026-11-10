const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+\d\s()-]{6,20}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class ValidationError extends Error {}

function cleanText(value, label, { max, required = true }) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text) {
    if (required) throw new ValidationError(`${label} est requis.`)
    return ''
  }
  if (text.length > max) throw new ValidationError(`${label} est trop long.`)
  return text
}

function cleanEmail(value) {
  const email = cleanText(value, 'E-mail', { max: 254 })
  if (!EMAIL_RE.test(email)) throw new ValidationError('E-mail invalide.')
  return email
}

function cleanPhone(value) {
  const phone = cleanText(value, 'Téléphone', { max: 20, required: false })
  if (phone && !PHONE_RE.test(phone)) throw new ValidationError('Téléphone invalide.')
  return phone
}

function cleanDate(value, label) {
  const date = cleanText(value, label, { max: 10 })
  const parsed = DATE_RE.test(date) ? new Date(`${date}T00:00:00Z`) : null
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new ValidationError(`${label} est invalide.`)
  }
  return date
}

function cleanInteger(value, label, { min, max }) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new ValidationError(`${label} doit être entre ${min} et ${max}.`)
  }
  return number
}

const validators = {
  contact(data) {
    return {
      name: cleanText(data.name, 'Nom', { max: 100 }),
      email: cleanEmail(data.email),
      phone: cleanPhone(data.phone),
      subject: cleanText(data.subject, 'Sujet', { max: 200, required: false }),
      message: cleanText(data.message, 'Message', { max: 5000 }),
    }
  },

  reservation(data) {
    const checkIn = cleanDate(data.checkIn, 'Date d’arrivée')
    const checkOut = cleanDate(data.checkOut, 'Date de départ')
    if (checkOut <= checkIn) {
      throw new ValidationError('La date de départ doit être après la date d’arrivée.')
    }
    return {
      name: cleanText(data.name, 'Nom', { max: 100 }),
      email: cleanEmail(data.email),
      phone: cleanPhone(data.phone),
      checkIn,
      checkOut,
      rooms: cleanInteger(data.rooms, 'Nombre de chambres', { min: 1, max: 10 }),
      adults: cleanInteger(data.adults, 'Nombre d’adultes', { min: 1, max: 20 }),
      children: cleanInteger(data.children ?? 0, 'Nombre d’enfants', { min: 0, max: 20 }),
      roomId: cleanText(data.roomId, 'Chambre', { max: 50, required: false }),
    }
  },

  event(data) {
    return {
      name: cleanText(data.name, 'Nom', { max: 100 }),
      email: cleanEmail(data.email),
      phone: cleanPhone(data.phone),
      eventDate: cleanDate(data.eventDate, 'Date de l’événement'),
      guestCount: cleanInteger(data.guestCount, 'Nombre de personnes', { min: 1, max: 1000 }),
      message: cleanText(data.message, 'Message', { max: 5000 }),
    }
  },
}

export const REQUEST_TYPES = Object.keys(validators)

export function validateRequest(body) {
  if (!body || typeof body !== 'object') throw new ValidationError('Requête invalide.')

  const type = body.type
  if (!REQUEST_TYPES.includes(type)) throw new ValidationError('Type de formulaire inconnu.')

  const page = cleanText(body.page, 'Page', { max: 200, required: false }) || '/'
  const data = body.data && typeof body.data === 'object' ? body.data : {}

  return { type, page, fields: validators[type](data) }
}
