# Example External Adapter for CoinPaprika

Example Source Adapter (this title and description were pulled from source/schemas/env.json)

## Environment Variables

| Required? |  Name   |  Description   |  Type  | Options | Default |
| :-------: | :-----: | :------------: | :----: | :-----: | :-----: |
|    ✅     | API_KEY | API key to use | string |         |         |

---

## Input Parameters

Every EA supports base input parameters from [this list](https://github.com/smartcontractkit/external-adapters-js/blob/develop/packages/core/bootstrap/README.md#base-input-parameters)

| Required? |   Name   |     Description     |  Type  |               Options               | Default |
| :-------: | :------: | :-----------------: | :----: | :---------------------------------: | :-----: |
|           | endpoint | The endpoint to use | string | [ticker-coin](#tickercoin-endpoint) | `coins` |

## TickerCoin Endpoint

Returns price data of a single cryptocurrency on coinpapria.com. It calls https://api.coinpaprika.com/v1/tickers/:id

`ticker-coin` is the only supported name for this endpoint.

### Input Params

| Required? |  Name  |    Aliases     |               Description                |  Type  | Options | Default | Depends On | Not Valid With |
| :-------: | :----: | :------------: | :--------------------------------------: | :----: | :-----: | :-----: | :--------: | :------------: |
|    ✅     | quote  | `market`, `to` | The symbol of the currency to convert to | string |         |         |            |                |
|    ✅     | coinid |  `id`, `name`  |          The coin ID (required)          | string |         |         |            |                |

### Example

There are no examples for this endpoint.

---

MIT License
