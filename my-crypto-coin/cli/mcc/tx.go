package main

import (
	"github.com/spf13/cobra"
	"my-crypto-coin/ledger"
	"fmt"
	"os"
)

func txCmd() *cobra.Command {
	var txsCmd = &cobra.Command{
		Use:   "tx",
		Short: "Interact with transactions (new...).",
		Run: func(cmd *cobra.Command, args []string) {
		},
	}

	txsCmd.AddCommand(newTxCmd())

	return txsCmd
}


func newTxCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Use:   "new",
		Short: "Adds new TX to the ledger.",
		Run: func(cmd *cobra.Command, args []string) {
			from, _ := cmd.Flags().GetString("from")
			to, _ := cmd.Flags().GetString("to")
			value, _ := cmd.Flags().GetUint("value")

			tx := ledger.NewTx(ledger.NewAccount(from), ledger.NewAccount(to), value)

			state, err := ledger.SyncState()
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				os.Exit(1)
			}
			defer state.Close()

			err = state.WriteToLedger(tx)
			if err != nil {
				fmt.Fprintln(os.Stderr, err)
				os.Exit(1)
			}

			fmt.Println("TX successfully added to the ledger.")
		},
	}

	cmd.Flags().String("from", "", "From what account to send coins")
	cmd.MarkFlagRequired("from")

	cmd.Flags().String("to", "", "To what account to send coins")
	cmd.MarkFlagRequired("to")

	cmd.Flags().Uint("value", 0, "How many coins to send")
	cmd.MarkFlagRequired("value")

	return cmd
}