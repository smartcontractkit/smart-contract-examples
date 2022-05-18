package main

import (
	"context"
	"log"
	"math/big"
	"os"
	"regexp"
	"time"

	"github.com/joho/godotenv"

	aggregatorv3 "chainlink-price-feed/aggregatorv3"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

func main() {

	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal(err)
	}

	// fetch rpc_url
	rpcUrl := os.Getenv("RPC_URL")
	if len(rpcUrl) == 0 {
		log.Fatal("rpcUrl is empty. check the .env file")
	}

	// check if chainlink feed proxy is provided in command line
	args := os.Args[1:]
	feedAddress := ""
	if len(args) >= 1 {
		// 1st argument in command line
		feedAddress = args[0]
	} else {
		// if not provided then check if present in .env file
		feedAddress = os.Getenv("DEFAULT_FEED_ADDR")
	}

	client, err := ethclient.Dial(rpcUrl)
	if err != nil {
		log.Fatal(err)
	}

	// Price Feed address
	chainlinkPriceFeedProxyAddress, isContract := isContractAddress(feedAddress, client)
	if !isContract {
		log.Fatalf("address %s is not a contract address\n", feedAddress)

	}
	chainlinkPriceFeedProxy, err := aggregatorv3.NewAggregatorV3Interface(chainlinkPriceFeedProxyAddress, client)
	if err != nil {
		log.Fatal(err)
	}

	roundData, err := chainlinkPriceFeedProxy.LatestRoundData(&bind.CallOpts{})
	if err != nil {
		log.Fatal(err)
	}

	decimals, err := chainlinkPriceFeedProxy.Decimals(&bind.CallOpts{})
	if err != nil {
		log.Fatal(err)
	}

	description, err := chainlinkPriceFeedProxy.Description(&bind.CallOpts{})
	if err != nil {
		log.Fatal(err)
	}

	// compute a big.int which is 10**decimals
	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)

	log.Printf("%v Price feed address is  %v\n", description, chainlinkPriceFeedProxyAddress)
	log.Printf("Round id is %v\n", roundData.RoundId)
	log.Printf("Answer is %v\n", roundData.Answer)
	log.Printf("Formatted answer is %v\n", divide(roundData.Answer, divisor))
	log.Printf("Started at %v\n", formatTime(roundData.StartedAt))
	log.Printf("Updated at %v\n", formatTime(roundData.UpdatedAt))
	log.Printf("Answered in round %v\n", roundData.AnsweredInRound)
}

func isContractAddress(addr string, client *ethclient.Client) (common.Address, bool) {
	if len(addr) == 0 {
		log.Fatal("feedAddress is empty.")
	}

	re := regexp.MustCompile("^0x[0-9a-fA-F]{40}$")
	if !re.MatchString(addr) {
		log.Fatalf("address %s non valid\n", addr)
	}

	address := common.HexToAddress(addr)
	bytecode, err := client.CodeAt(context.Background(), address, nil) // nil is latest block
	if err != nil {
		log.Fatal(err)
	}
	isContract := len(bytecode) > 0
	return address, isContract
}

func formatTime(timestamp *big.Int) time.Time {
	timestampInt64 := timestamp.Int64()
	if timestampInt64 == 0 {
		log.Fatalf("timestamp %v cannot be represented as int64", timestamp)
	}
	return time.Unix(timestampInt64, 0)
}

func divide(num1 *big.Int, num2 *big.Int) *big.Float {
	if num2.BitLen() == 0 {
		log.Fatal("cannot divide by zero.")
	}
	num1BigFloat := new(big.Float).SetInt(num1)
	num2BigFloat := new(big.Float).SetInt(num2)
	result := new(big.Float).Quo(num1BigFloat, num2BigFloat)
	return result
}
