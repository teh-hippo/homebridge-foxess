import * as FoxESS from './foxess/api'

/*
* Basic example showing how to retrieve data from the FoxESS API.
*/
(async () => {
  const apiKey = process.env.API_KEY
  if (apiKey === undefined) {
    throw new Error('API_KEY is not set.')
  }
  const inverters = await FoxESS.getDeviceList(apiKey)
  console.info(`Returned ${inverters.length} inverter(s):`)
  for (const inverter of inverters) {
    console.log(`\t${JSON.stringify(inverter)}:`)
    const data = await FoxESS.getRealTimeData(apiKey, { inverter })
    console.log(JSON.stringify(data))
  }
})().catch(e => { console.error(e) })
