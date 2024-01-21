import { Md5 } from 'ts-md5'

export function calculateSignature (path: string, apiKey: string, timestamp: number): string {
  return Md5.hashStr(`${path}\\r\\n${apiKey}\\r\\n${timestamp.toString()}`)
}

export async function call<TRequest, TResponse> (path: string, apiKey: string, request: TRequest): Promise<TResponse> {
  const timestamp = Date.now()
  const signature = calculateSignature(path, apiKey, timestamp)
  const response = await fetch(`https://www.foxesscloud.com${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: apiKey,
      signature,
      timestamp: timestamp.toString(),
      lang: 'en'
    },
    body: JSON.stringify(request)
  })
  if (response.status !== 200) {
    throw new Error(`Invalid response code: ${response.status}`)
  } else {
    const json: string = await response.text()
    try {
      const result: TResponse = JSON.parse(json)
      return result
    } catch (e) {
      const mine = `Unable to parse JSON: ${json}\nRoot: `
      if (e instanceof Error) {
        throw new Error(`${mine}${e.message}\n${e.stack}`)
      } else {
        throw new Error(`${mine}${e?.toString()}`)
      }
    }
  }
}
