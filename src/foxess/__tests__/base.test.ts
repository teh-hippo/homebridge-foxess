import { calculateSignature, header } from '../base'

describe('testing foxess apis', () => {
  const testPath = '/op/v0/device/list'
  const testAPIKey = 'abcdefghij012345689'
  const testTimestamp = 1705809089
  const expectedSignature = '68a007c2450d6697fbe2990f92000269'
  test('calculateSignature returns expected result', () => {
    expect(calculateSignature(testPath, testAPIKey, testTimestamp)).toBe(expectedSignature)
  })

  test('calculateSignature uses path', () => {
    expect(calculateSignature('/op/v0/device/generation', testAPIKey, testTimestamp)).not.toBe(expectedSignature)
  })

  test('calculateSignature usese apiKey', () => {
    expect(calculateSignature(testPath, `a${testAPIKey}b`, testTimestamp)).not.toBe(expectedSignature)
  })

  test('calculateSignature uses timestamp', () => {
    expect(calculateSignature(testPath, testAPIKey, testTimestamp + 1)).not.toBe(expectedSignature)
  })
})

describe('testing foxess apis', () => {
  test('header returns expected result', () => {
    const actual = header('/op/v0/device/list', 'abcdefghij012345689')
    expect(actual['Content-Type']).toBe('application/json')
    expect(actual.signature).not.toHaveLength(0)
    expect(actual.timestamp).not.toHaveLength(0)
    expect(actual.lang).toBe('en')
  })
})
