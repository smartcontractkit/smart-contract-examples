#!/usr/bin/env bash

# Read the Mumbai RPC URL
echo Enter Your Mumbai RPC URL:
echo Example: "https://polygon-mumbai.g.alchemy.com/v2/XXXXXXXXXX"
read -s rpc

# Read the contract name
echo Which contract do you want to deploy \(eg Greeter\)?
read contract

forge create ./src/${contract}.sol:${contract} -i --rpc-url $rpc
