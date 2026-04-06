export const PAYMONGO_TEST_TOOLS_ENABLED = import.meta.env.VITE_ENABLE_PAYMONGO_TEST_TOOLS === 'true'

export async function createPayMongoTestLink({ amount, description, remarks }) {
  const response = await fetch('/api/paymongo/create-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      description,
      remarks,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Could not create a PayMongo test link.')
  }

  return payload
}
