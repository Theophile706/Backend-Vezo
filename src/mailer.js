export function createResendMailer(apiKey) {
  return {
    async sendMail({ from, to, replyTo, subject, html, text }) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, reply_to: replyTo, subject, html, text }),
      })
      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        throw new Error(`Resend ${response.status} ${detail}`.trim())
      }
    },
  }
}
