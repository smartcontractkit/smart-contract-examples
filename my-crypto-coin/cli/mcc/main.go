package main

import (
	"github.com/spf13/cobra"
	"os"
	"fmt"
)

func main() {
	var mccCmd = &cobra.Command{
		Use:   "mcc",
		Short: "My Crypto Coin CLI",
		Run: func(cmd *cobra.Command, args []string) {
		},
	}

	mccCmd.AddCommand(versionCmd)
	mccCmd.AddCommand(balancesCmd())
	mccCmd.AddCommand(txCmd())

	err := mccCmd.Execute()
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}