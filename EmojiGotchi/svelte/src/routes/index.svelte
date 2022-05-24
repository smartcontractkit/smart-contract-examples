<script>
	import EmojiGotchiAbi from '../contracts/EmojiGotchi.json';
	//
	const contractAddr = '<PLACE HOLDER>';

	import WalletConnect from '$lib/WalletConnect.svelte';
	import EmojiGotchi from '../lib/EmojiGotchi.svelte';

	export let web3Props = {
		provider: null,
		signer: null,
		account: null,
		chainId: null,
		contract: null
	};
</script>

<h1>My EmojiGotchi</h1>
{#if !web3Props.account}
	<WalletConnect bind:web3Props {contractAddr} contractAbi={EmojiGotchiAbi} />
{:else}
	<EmojiGotchi bind:web3Props />
{/if}
