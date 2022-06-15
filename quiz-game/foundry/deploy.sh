#!/usr/bin/env bash

# Read the RPC URL
echo Enter Your RPC URL:
echo Example: "https://eth-goerli.alchemyapi.io/v2//XXXXXXXXXX"
read -s rpc

# Read the contract name
echo Which contract do you want to deploy \(eg Greeter\)?
read contract

forge create ./src/${contract}.sol:${contract} -i --rpc-url $rpc