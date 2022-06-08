import { Requester, util, Validator } from '@chainlink/ea-bootstrap'
import { Config, ExecuteWithConfig, AdapterRequest, InputParameters } from '@chainlink/types'
import { GetTickersByIdResponseSchema } from '../types'

// This should be filled in with a lowercase name corresponding to the API endpoint.
// The supportedEndpoints list must be present for README generation.
export const supportedEndpoints = ['ticker-coin']

// The description string is used to explain how the endpoint works, and is used for part of the endpoint's README section
export const description =
  'Returns price data of a single cryptocurrency on coinpapria.com. It calls https://api.coinpaprika.com/v1/tickers/:id'

const buildPath =
  () =>
  (request: AdapterRequest): string => {
    const validator = new Validator(request, inputParameters)
    const quote = validator.validated.data.quote
    return `quotes.${quote.toUpperCase()}.price`
  }

// Define how to parse the response to fetch the result
export const endpointResultPaths = {
  'ticker-coin': buildPath(),
}

/**
 * define a function which returns an error based on the response returned by the API provider
 * @param coinId
 * @returns
 */
const customError = (coinId: string) => {
  return (data: GetTickersByIdResponseSchema) => data.id.toLowerCase() !== coinId
}

/**
 * The inputParameters object must be present for README generation.
 * @see InputParameters for more config options
 *
 * */
export const inputParameters: InputParameters = {
  quote: {
    aliases: ['to', 'market'],
    description: 'The symbol of the currency to convert to',
    required: true,
    type: 'string',
  },
  coinid: {
    aliases: ['id', 'name'],
    description: 'The coin ID (required)',
    required: true,
    type: 'string',
  },
}

export const execute: ExecuteWithConfig<Config> = async (request, _, config) => {
  const validator = new Validator(request, inputParameters)

  const jobRunID = validator.validated.id
  const quote = validator.validated.data.quote as string
  const coinid = validator.validated.data.coinid as string

  const url = util.buildUrlPath('v1/tickers/:coin', { coin: coinid.toLowerCase() })

  const resultPath = validator.validated.data.resultPath

  // url parameters
  const params = { quotes: quote.toLowerCase() }

  /**
   * @see https://axios-http.com/docs/req_config
   */
  const options = { ...config.api, params, url }

  const response = await Requester.request<GetTickersByIdResponseSchema>(
    options,
    customError(coinid),
  )

  const result = Requester.validateResultNumber(response.data, resultPath)
  // return Requester.success(jobRunID, response, config.verbose)

  return Requester.success(jobRunID, Requester.withResult(response, result), config.verbose)
}
