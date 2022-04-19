package ledger

type Account string

type Tx struct {
	From  Account `json:"from"`
	To    Account `json:"to"`
	Value uint    `json:"value"`
}

func NewAccount(value string) Account {
	return Account(value)
}

func NewTx(from Account, to Account, value uint) Tx {
	return Tx{from, to, value}
}
