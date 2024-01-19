import { type API, type DynamicPlatformPlugin, type Logger, type PlatformAccessory, type PlatformConfig, type Service, type Characteristic } from 'homebridge'
import { PLATFORM_NAME, PLUGIN_NAME } from './settings'
import type { Inverter } from './foxess/devices'
import * as FoxESS from './foxess/api'
import { RealTimeUsageAccessory } from './RealTimeUsageAccessory'

export class FoxESSPlatform implements DynamicPlatformPlugin {
  public readonly apiKey: string
  public readonly interval: number
  public readonly Service: typeof Service = this.api.hap.Service
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic
  private readonly realTimeAccessories: RealTimeUsageAccessory[] = []

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = []

  constructor (
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API
  ) {
    this.log.debug('Finished initializing platform:', this.config.name)
    this.apiKey = config.apiKey
    this.interval = config.interval ?? 60 * 1000

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // Dynamic Platform plugins should only register new accessories after this event was fired,
    // in order to ensure they weren't added to homebridge already. This event can also be used
    // to start discovery of new accessories.
    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback')
      // run the method to discover / register your devices as accessories
      this.discoverDevices().catch((e) => { log.error(`Unable to discover: ${e}`) })
    })
  }

  /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
  configureAccessory (accessory: PlatformAccessory): void {
    this.log.info('Loading accessory from cache:', accessory.displayName)

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory)
  }

  /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
  async discoverDevices (): Promise<void> {
    const inverters = await FoxESS.getDeviceList(this.apiKey)

    for (const device of inverters) {
      const uuid = this.api.hap.uuid.generate(device.deviceSN)
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid) as PlatformAccessory<Inverter>

      if (existingAccessory != null) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)
        existingAccessory.context = device
        this.api.updatePlatformAccessories([existingAccessory])
        this.realTimeAccessories.push(new RealTimeUsageAccessory(this, existingAccessory))
      } else {
        this.log.info('Adding new accessory:', device.deviceSN)
        // eslint-disable-next-line new-cap
        const accessory = new this.api.platformAccessory<Inverter>(device.deviceSN, uuid)

        // store a copy of the device object in the `accessory.context`
        // the `context` property can be used to store any data about the accessory you may need
        accessory.context = device

        // create the accessory handler for the newly create accessory
        // this is imported from `platformAccessory.ts`
        this.realTimeAccessories.push(new RealTimeUsageAccessory(this, accessory))

        // link the accessory to your platform
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
      }
    }
  }
}
