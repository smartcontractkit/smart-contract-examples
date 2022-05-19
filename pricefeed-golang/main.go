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

	// Read the .env file
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatal(err)
	}

	// Fetch the rpc_url.
	rpcUrl := os.Getenv("RPC_URL")
	if len(rpcUrl) == 0 {
		log.Fatal("rpcUrl is empty. check the .env file")
	}

	// Assign default values to feedAddress, and update value if a feed address was passed in the command line.
	feedAddress := os.Getenv("DEFAULT_FEED_ADDR")
	if len(os.Args) > 1 && os.Args[1] != "" {
		feedAddress = os.Args[1]
	}

	// Initialize client instance using the rpcUrl.
	client, err := ethclient.Dial(rpcUrl)
	if err != nil {
		log.Fatal(err)
	}

	// Test if it is a contract address.
	ok := isContractAddress(feedAddress, client)
	if !ok {
		log.Fatalf("address %s is not a contract address\n", feedAddress)
	}

	chainlinkPriceFeedProxyAddress := common.HexToAddress(feedAddress)
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

	// Compute a big.int which is 10**decimals.
	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(decimals)), nil)

	log.Printf("%v Price feed address is  %v\n", description, chainlinkPriceFeedProxyAddress)
	log.Printf("Round id is %v\n", roundData.RoundId)
	log.Printf("Answer is %v\n", roundData.Answer)
	log.Printf("Formatted answer is %v\n", divideBigInt(roundData.Answer, divisor))
	log.Printf("Started at %v\n", formatTime(roundData.StartedAt))
	log.Printf("Updated at %v\n", formatTime(roundData.UpdatedAt))
	log.Printf("Answered in round %v\n", roundData.AnsweredInRound)
}

func isContractAddress(addr string, client *ethclient.Client) bool {
	if len(addr) == 0 {
		log.Fatal("feedAddress is empty.")
	}

	// Ensure it is an Ethereum address: 0x followed by 40 hexadecimal characters.
	re := regexp.MustCompile("^0x[0-9a-fA-F]{40}$")
	if !re.MatchString(addr) {
		log.Fatalf("address %s non valid\n", addr)
	}

	// Ensure it is a contract address.
	address := common.HexToAddress(addr)
	bytecode, err := client.CodeAt(context.Background(), address, nil) // nil is latest block
	if err != nil {
		log.Fatal(err)
	}
	isContract := len(bytecode) > 0
	return isContract
}

func formatTime(timestamp *big.Int) time.Time {
	timestampInt64 := timestamp.Int64()
	if timestampInt64 == 0 {
		log.Fatalf("timestamp %v cannot be represented as int64", timestamp)
	}
	return time.Unix(timestampInt64, 0)
}

func divideBigInt(num1 *big.Int, num2 *big.Int) *big.Float {
	if num2.BitLen() == 0 {
		log.Fatal("cannot divide by zero.")
	}
	num1BigFloat := new(big.Float).SetInt(num1)
	num2BigFloat := new(big.Float).SetInt(num2)
	result := new(big.Float).Quo(num1BigFloat, num2BigFloat)
	return result
}
