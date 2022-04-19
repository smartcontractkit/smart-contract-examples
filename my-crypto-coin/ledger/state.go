package ledger

import (
	"fmt"
	"os"
	"path/filepath"
	"bufio"
	"encoding/json"
)

type State struct {
	Balances  map[Account]uint
	txMempool []Tx

	dbFile *os.File
}


func SyncState() (*State, error)  {
	cwd, err := os.Getwd()
	if err != nil {
		return nil, err
	}

	gen, err := loadGenesis(filepath.Join(cwd, "ledger", "genesis.json"))
	if err != nil {
		return nil, err
	}

	balances := make(map[Account]uint)
	for account, balance := range gen.Balances {
		balances[account] = balance
	}

	file, err := os.OpenFile(filepath.Join(cwd, "ledger", "ledger.db"), os.O_APPEND|os.O_RDWR, 0600)
	if err != nil {
		return nil, err
	}

	scanner := bufio.NewScanner(file)

	state := &State{balances, make([]Tx, 0), file}

	for scanner.Scan() {
		if err := scanner.Err(); err != nil {
			return nil, err
		}

		var transaction Tx
		json.Unmarshal(scanner.Bytes(), &transaction)

		if err := state.writeTransaction(transaction); err != nil {
			return nil, err
		}
	}

	return state, nil
}

func (s *State) writeTransaction(tx Tx) error {
	if s.Balances[tx.From] < tx.Value {
		return fmt.Errorf("insufficient balance")
	}

	s.Balances[tx.From] -= tx.Value
	s.Balances[tx.To] += tx.Value

	return nil
}

func (s *State) Close() {
	s.dbFile.Close()
}

func (s *State) WriteToLedger(tx Tx) error {
	if err := s.writeTransaction(tx); err != nil {
		return err
	}

	s.txMempool = append(s.txMempool, tx)

	mempool := make([]Tx, len(s.txMempool))
	copy(mempool, s.txMempool)

	for i := 0; i < len(mempool); i++ {
		txJson, err := json.Marshal(mempool[i])
		if err != nil {
			return err
		}

		if _, err = s.dbFile.Write(append(txJson, '\n')); err != nil {
			return err
		}
		s.txMempool = s.txMempool[1:]
	}

	return nil
}