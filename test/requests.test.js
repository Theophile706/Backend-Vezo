import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

function startServer({ fail = false } = {}) {
  const sent = []
  const mailer = {
    async sendMail(message) {
      if (fail) throw new Error('SMTP down')
      sent.push(message)
    },
  }
  const app = createApp({
    mailer,
    mailFrom: 'site@example.com',
    mailTo: 'owner@example.com',
    corsOrigins: ['http://localhost:5173'],
  })
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address()
      resolve({
        sent,
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      })
    })
  })
}

async function post(url, body) {
  const response = await fetch(`${url}/api/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

const validContact = {
  type: 'contact',
  page: '/contact',
  data: { name: 'Jean', email: 'jean@example.com', phone: '+261 34 00 000 00', subject: 'Info', message: 'Bonjour' },
}

const validReservation = {
  type: 'reservation',
  page: '/contact',
  data: {
    name: 'Marie',
    email: 'marie@example.com',
    phone: '',
    checkIn: '2026-12-10',
    checkOut: '2026-12-12',
    rooms: 1,
    adults: 2,
    children: 0,
    roomId: 'suite',
  },
}

test('health endpoint responds ok', async () => {
  const server = await startServer()
  try {
    const response = await fetch(`${server.url}/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok' })
  } finally {
    await server.close()
  }
})

test('valid contact request is sent with visitor as Reply-To', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, validContact)
    assert.equal(result.status, 201)
    assert.equal(server.sent.length, 1)
    assert.equal(server.sent[0].replyTo, 'jean@example.com')
    assert.equal(server.sent[0].to, 'owner@example.com')
    assert.match(server.sent[0].html, /Bonjour/)
  } finally {
    await server.close()
  }
})

test('HTML in visitor fields is escaped', async () => {
  const server = await startServer()
  try {
    await post(server.url, {
      ...validContact,
      data: { ...validContact.data, name: '<img src=x onerror=alert(1)>', message: '<script>x</script>' },
    })
    const html = server.sent[0].html
    assert.ok(!html.includes('<img src=x'))
    assert.ok(!html.includes('<script>x</script>'))
    assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/)
  } finally {
    await server.close()
  }
})

test('invalid contact email is rejected without sending', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, {
      ...validContact,
      data: { ...validContact.data, email: 'pas-un-email' },
    })
    assert.equal(result.status, 400)
    assert.equal(server.sent.length, 0)
  } finally {
    await server.close()
  }
})

test('reservation with checkout before checkin is rejected', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, {
      ...validReservation,
      data: { ...validReservation.data, checkIn: '2026-12-12', checkOut: '2026-12-10' },
    })
    assert.equal(result.status, 400)
    assert.equal(server.sent.length, 0)
  } finally {
    await server.close()
  }
})

test('valid reservation is sent', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, validReservation)
    assert.equal(result.status, 201)
    assert.match(server.sent[0].subject, /10\/12\/2026/)
    assert.match(server.sent[0].html, /Chambre souhaitée/)
  } finally {
    await server.close()
  }
})

const validEvent = {
  type: 'event',
  page: '/evenements',
  data: {
    name: 'Paul',
    email: 'paul@example.com',
    phone: '',
    subject: '',
    message: 'Mariage en juin',
    eventDate: '2026-06-20',
    guestCount: '80',
  },
}

test('valid event inquiry is sent', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, validEvent)
    assert.equal(result.status, 201)
    assert.match(server.sent[0].subject, /Demande de devis de Paul \(20\/06\/2026\)/)
    assert.match(server.sent[0].html, /Nombre de personnes/)
  } finally {
    await server.close()
  }
})

test('unknown form type is rejected', async () => {
  const server = await startServer()
  try {
    const result = await post(server.url, { type: 'newsletter', data: { email: 'a@b.co' } })
    assert.equal(result.status, 400)
  } finally {
    await server.close()
  }
})

test('SMTP failure returns 502 so the form does not show success', async () => {
  const server = await startServer({ fail: true })
  try {
    const result = await post(server.url, validContact)
    assert.equal(result.status, 502)
  } finally {
    await server.close()
  }
})
