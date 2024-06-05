[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
![node](https://img.shields.io/node/v/homebridge-foxess)
[![npm](https://img.shields.io/npm/dt/homebridge-foxess.svg)](https://www.npmjs.com/package/homebridge-foxess)
[![npm version](https://badge.fury.io/js/homebridge-foxess.svg)](https://badge.fury.io/js/homebridge-foxess)
![Node.js CI](https://github.com/teh-hippo/homebridge-foxess/workflows/Node.js%20CI/badge.svg)

# Homebridge FoxESS

This plugin exposes HomeKit to solar data provided by [FoxESS](https://www.foxesscloud.com/) and those who use its platform, such as [Energizer Solar](https://portal.energizersolar.com/).

Created are various accessories that help power-optimising automations in HomeKit.

Currently, only a light sensor is exposed that indicates the current solar generation.

*This plugin is still in early development.*

Example `config.json`:

```json
    "platforms": [
        {
            "name": "FoxESS",
            "platform": "HomebridgeFoxESS",
            "apiKey": "<your-api-key>",
            "interval": "60000"
        }
    ]
```

## Parameters

| Parameter | Description | Required | Default
| --------- | ----- | ------- | ------ |
| `apiKey`| API Key provided by FoxESS Cloud. | `true` | |
| `interval`| How often to update current usage | `false` | `300000` (5 minutes) |

## Obtaining an API Key

1. Login to [FoxESS Cloud](https://www.foxesscloud.com)
1. Click on the top-right user icon, and select [User Profile](https://www.foxesscloud.com/user/center)
1. Under 'API Management', hit 'Generate API Key'.

Note: There is currently a limit of 1440 calls per day for an API Key, equating to once per minute.
