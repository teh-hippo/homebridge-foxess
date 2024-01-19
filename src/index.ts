import { type API } from 'homebridge'
import { PLATFORM_NAME } from './settings'
import { FoxESSPlatform } from './platform'

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, FoxESSPlatform)
}
