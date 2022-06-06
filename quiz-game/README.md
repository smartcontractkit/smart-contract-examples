# On Chain Crypto Quiz Game
This repo will support the tutorial for building a crypto quiz game. 
---
The game stores quiz questions on the blockchain and their answers. The answers are hashed via `keccak256`, so you can verify the answer without giving it away. `Keccak256` is a one-way cryptographic hash function, and it cannot be decoded in reverse. This means the way to check if the answer is correct will be to provide a guess and hash it. If both hashes match, your answer is correct.

This tutorial will use:
* [Solidity](https://docs.soliditylang.org/)
* [Goerli](https://goerli.net/)
* [Foundry](https://github.com/foundry-rs/foundry)
* [SvelteKit](https://kit.svelte.dev/)


---
## Deploying the contract

Use `deploy.sh` to deploy the contract, follow the prompts, the name of the contract to deploy is `GameFactory`
```bash
❯ quiz-game (main) ✘ cd foundry
❯ foundry (main) ✘ ./deploy.sh
```

---
## Running the front end

Replace `<YOUR_CONTRACT_HERE>` in `svelte/src/routes/index.svelte` with the address of the contract you just deployed.

```bash
❯ quiz-game (main) ✘ cd svelte
❯ svelte (main) ✘ npm install

> svelte@0.0.1 prepare
> svelte-kit sync


up to date, audited 277 packages in 936ms

53 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
❯ svelte (main) ✘ npm run dev -- --open

> svelte@0.0.1 dev
> svelte-kit dev "--open"


  SvelteKit v1.0.0-next.347

  local:   http://localhost:3000
  network: not exposed

  Use --host to expose server to other devices on this network
```
