import { Md5 } from 'ts-md5'
import { RealTimeDataRequest, RealTimeDataVariables } from './RealTimeData'
import type { RealTimeDataResponse } from './RealTimeData'

function calculateSignature (path: string, apiKey: string, timestamp: number): string {
  return Md5.hashStr(`${path}\\r\\n${apiKey}\\r\\n${timestamp.toString()}`)
}

async function getRealTimeData (apiKey: string): Promise<RealTimeDataResponse> {
  const request = new RealTimeDataRequest()
  request.variables = RealTimeDataVariables
  return await getApiCall('/op/v0/device/real/query', apiKey, new RealTimeDataRequest())
}

async function getApiCall<TRequest, TResponse> (path: string, apiKey: string, request: TRequest): Promise<TResponse> {
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
      console.debug(`Response: ${json}`)
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

export { getRealTimeData }
