import { calculateSignature } from '../base'

describe('testing foxess apis', () => {
  const examplePath = '/test/path/here'
  const exampleApiKey = 'abcdefghij012345689'
  const exampleTimestamp = 1705809089
  const expectedSignature = '69f2aac8301e5b8ba9a7cd6fc912d54e'
  test('calculateSignature returns expected result', () => {
    expect(calculateSignature(examplePath, exampleApiKey, exampleTimestamp)).toBe(expectedSignature)
  })

  test('calculateSignature uses path', () => {
    expect(calculateSignature(`/alt/${examplePath}/CHANGED`, exampleApiKey, exampleTimestamp)).not.toBe(expectedSignature)
  })

  test('calculateSignature usese apiKey', () => {
    expect(calculateSignature(examplePath, `a${exampleApiKey}b`, exampleTimestamp)).not.toBe(expectedSignature)
  })

  test('calculateSignature uses timestamp', () => {
    expect(calculateSignature(examplePath, exampleApiKey, exampleTimestamp + 1)).not.toBe(expectedSignature)
  })
})
