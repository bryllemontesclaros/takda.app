function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function getErrorMessage(payload) {
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const first = payload.errors[0]
    return first.detail || first.code || 'PayMongo request failed.'
  }

  return payload?.message || 'PayMongo request failed.'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }

  const secretKey = process.env.PAYMONGO_SECRET_KEY
  if (!secretKey) {
    return sendJson(res, 500, { error: 'Missing PAYMONGO_SECRET_KEY on the server.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}')
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON body.' })
    }
  }

  const amount = Number(body?.amount)
  const description = String(body?.description || 'Takda test checkout').trim()
  const remarks = String(body?.remarks || '').trim()

  if (!Number.isFinite(amount) || amount <= 0) {
    return sendJson(res, 400, { error: 'Amount must be greater than 0.' })
  }

  const amountInCentavos = Math.round(amount * 100)
  if (amountInCentavos < 100) {
    return sendJson(res, 400, { error: 'Amount must be at least PHP 1.00.' })
  }

  try {
    const response = await fetch('https://api.paymongo.com/v1/links', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountInCentavos,
            currency: 'PHP',
            description,
            remarks,
          },
        },
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return sendJson(res, response.status, { error: getErrorMessage(payload) })
    }

    return sendJson(res, 200, {
      linkId: payload?.data?.id || '',
      checkoutUrl: payload?.data?.attributes?.checkout_url || '',
      referenceNumber: payload?.data?.attributes?.reference_number || '',
      livemode: Boolean(payload?.data?.attributes?.livemode),
      amount,
    })
  } catch {
    return sendJson(res, 500, { error: 'Could not reach PayMongo right now.' })
  }
}
