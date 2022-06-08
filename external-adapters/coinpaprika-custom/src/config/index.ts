import { Requester } from '@chainlink/ea-bootstrap'
import { Config } from '@chainlink/types'

export const NAME = 'COINPAPRIKA_CUSTOM' // This should be filled in with a name corresponding to the data provider using UPPERCASE and _underscores_.

export const DEFAULT_ENDPOINT = 'coins'
export const DEFAULT_API_ENDPOINT = 'https://api.coinpaprika.com'
export const PRO_API_ENDPOINT = 'https://api-pro.coinpaprika.com'

export const makeConfig = (prefix?: string): Config => {
  const config = Requester.getDefaultConfig(prefix)
  const headers: { [T: string]: string | boolean } = {}
  if (config.apiKey) headers['Authorization'] = config.apiKey
  config.api.baseURL =
    config.api.baseURL || (config.apiKey ? PRO_API_ENDPOINT : DEFAULT_API_ENDPOINT)
  config.api.headers = headers
  config.defaultEndpoint = DEFAULT_ENDPOINT
  return config
}
