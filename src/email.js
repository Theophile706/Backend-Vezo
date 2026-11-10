const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char])
}

function formatDate(iso) {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

const TEMPLATES = {
  contact: {
    title: 'Nouveau message depuis le site',
    fields: [
      ['name', 'Nom'],
      ['email', 'E-mail'],
      ['phone', 'Téléphone'],
      ['subject', 'Sujet'],
      ['message', 'Message'],
    ],
    subject: ({ name }) => `Nouveau message de ${name}`,
  },
  reservation: {
    title: 'Nouvelle demande de réservation',
    fields: [
      ['name', 'Nom'],
      ['email', 'E-mail'],
      ['phone', 'Téléphone'],
      ['checkIn', 'Arrivée', formatDate],
      ['checkOut', 'Départ', formatDate],
      ['rooms', 'Chambres'],
      ['adults', 'Adultes'],
      ['children', 'Enfants'],
      ['roomId', 'Chambre souhaitée'],
    ],
    subject: ({ name, checkIn, checkOut }) =>
      `Demande de réservation de ${name} (${formatDate(checkIn)} au ${formatDate(checkOut)})`,
  },
  event: {
    title: 'Nouvelle demande de devis',
    fields: [
      ['name', 'Nom'],
      ['email', 'E-mail'],
      ['phone', 'Téléphone'],
      ['eventDate', 'Date de l’événement', formatDate],
      ['guestCount', 'Nombre de personnes'],
      ['message', 'Projet'],
    ],
    subject: ({ name, eventDate }) => `Demande de devis de ${name} (${formatDate(eventDate)})`,
  },
}

function cleanSubject(value) {
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, 200)
}

function detailRowHtml(label, value) {
  return `
              <tr>
                <td style="padding:14px 0;border-bottom:1px solid #ece8df;width:36%;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:14px 0;border-bottom:1px solid #ece8df;color:#111827;font-size:15px;vertical-align:top;">${escapeHtml(value)}</td>
              </tr>`
}

export function buildRequestEmail({ type, page, fields }, { from, to, receivedAt }) {
  const template = TEMPLATES[type]
  const rows = template.fields
    .filter(([key]) => fields[key] !== undefined && fields[key] !== '' && fields[key] !== null)
    .map(([key, label, format]) => ({
      key,
      label,
      value: format ? format(String(fields[key])) : String(fields[key]),
    }))
  const receivedText = receivedAt.toLocaleString('fr-FR', { timeZone: 'Indian/Antananarivo' })

  const detailsHtml = rows
    .filter(({ key }) => key !== 'name' && key !== 'message')
    .map(({ label, value }) => detailRowHtml(label, value))
    .join('')
  const message = rows.find(({ key }) => key === 'message')
  const messageHtml = message
    ? `
        <tr>
          <td style="padding:28px 36px 0;">
            <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Message</div>
            <div style="background:#faf7f0;border-left:4px solid #BC8A0F;border-radius:6px;padding:18px 20px;font-size:15px;line-height:1.7;color:#111827;white-space:pre-line;">${escapeHtml(message.value)}</div>
          </td>
        </tr>`
    : ''

  const name = escapeHtml(fields.name)
  const email = escapeHtml(fields.email)

  const html = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(template.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(template.title)} de ${name}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#292059;padding:36px 36px 30px;text-align:center;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:4px;color:#d9b45a;text-transform:uppercase;">Le Vezo Beach</div>
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#ffffff;margin-top:12px;">${escapeHtml(template.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="height:3px;background:#BC8A0F;line-height:3px;font-size:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:32px 36px 0;">
                <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">De la part de</div>
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#111827;margin-top:6px;">${name}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #ece8df;">${detailsHtml}
                </table>
              </td>
            </tr>${messageHtml}
            <tr>
              <td align="center" style="padding:32px 36px 12px;">
                <a href="mailto:${email}" style="display:inline-block;background:#292059;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;">Répondre à ${name}</a>
              </td>
            </tr>
            <tr>
              <td style="background:#faf7f0;padding:20px 36px;font-size:12px;color:#6b7280;line-height:1.7;">
                Page d’origine : ${escapeHtml(page)}<br />
                Reçu le ${escapeHtml(receivedText)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    template.title,
    '',
    ...rows.map(({ label, value }) => `${label} : ${value}`),
    '',
    `Page d’origine : ${page}`,
    `Reçu le ${receivedText}`,
  ].join('\n')

  return {
    from,
    to,
    replyTo: fields.email,
    subject: cleanSubject(template.subject(fields)),
    html,
    text,
  }
}
