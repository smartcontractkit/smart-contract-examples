// This example shows how to make a decentralized price feed using multiple APIs

// Arguments can be provided when a request is initated on-chain and used in the request source code as shown below
const coinMarketCapCoinId = args[0]
const coinGeckoCoinId = args[1]
const coinPaprikaCoinId = args[2]

if (
  !secrets.apiKey ||
  secrets.apiKey === "Your coinmarketcap API key (get a free one: https://coinmarketcap.com/api/)"
) {
  throw Error(
    "COINMARKETCAP_API_KEY environment variable not set for CoinMarketCap API.  Get a free key from https://coinmarketcap.com/api/"
  )
}

// build HTTP request objects

const coinMarketCapRequest = Functions.makeHttpRequest({
  url: `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest`,
  // Get a free API key from https://coinmarketcap.com/api/
  headers: { "X-CMC_PRO_API_KEY": secrets.apiKey },
  params: {
    convert: "USD",
    id: coinMarketCapCoinId,
  },
})

const coinGeckoRequest = Functions.makeHttpRequest({
  url: `https://api.coingecko.com/api/v3/simple/price`,
  params: {
    ids: coinGeckoCoinId,
    vs_currencies: "usd",
  },
})

const coinPaprikaRequest = Functions.makeHttpRequest({
  url: `https://api.coinpaprika.com/v1/tickers/${coinPaprikaCoinId}`,
})

// First, execute all the API requests are executed concurrently, then wait for the responses
const [coinMarketCapResponse, coinGeckoResponse, coinPaprikaResponse, badApiResponse] = await Promise.all([
  coinMarketCapRequest,
  coinGeckoRequest,
  coinPaprikaRequest,
])

const prices = []

if (!coinMarketCapResponse.error) {
  prices.push(coinMarketCapResponse.data.data[coinMarketCapCoinId].quote.USD.price)
} else {
  console.log("CoinMarketCap Error")
}

if (!coinGeckoResponse.error) {
  prices.push(coinGeckoResponse.data[coinGeckoCoinId].usd)
} else {
  console.log("CoinGecko Error")
}
if (!coinPaprikaResponse.error) {
  prices.push(coinPaprikaResponse.data.quotes.USD.price)
} else {
  console.log("CoinPaprika Error")
}

// At least 2 out of 3 prices are needed to aggregate the median price
if (prices.length < 2) {
  // If an error is thrown, it will be returned back to the smart contract
  throw Error("More than 1 API failed")
}

// fetch the price
const medianPrice = prices.sort((a, b) => a - b)[Math.round(prices.length / 2)]
console.log(`Median Bitcoin price: $${medianPrice.toFixed(2)}`)

// price * 100 to move by 2 decimals (Solidity doesn't support decimals)
// Math.round() to round to the nearest integer
// Functions.encodeUint256() helper function to encode the result from uint256 to bytes
return Functions.encodeUint256(Math.round(medianPrice * 100))
