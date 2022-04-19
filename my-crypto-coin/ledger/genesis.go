package ledger

import (
	"io/ioutil"
	"encoding/json"
)

type Genesis struct {
	Balances map[Account]uint `json:"balances"`
}

func loadGenesis(path string) (Genesis, error) {
	genesisFileContent, err := ioutil.ReadFile(path)
	if err != nil {
		return Genesis{}, err
	}

	var loadedGenesis Genesis
	
	err = json.Unmarshal(genesisFileContent, &loadedGenesis)
	if err != nil {
		return Genesis{}, err
	}

	return loadedGenesis, nil
} 