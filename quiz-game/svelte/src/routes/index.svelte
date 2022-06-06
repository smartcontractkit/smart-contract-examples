<script>
	import WalletConnect from '$lib/WalletConnect.svelte';
	import AddQuestion from '$lib/AddQuestion.svelte';
	import AllQuestions from '$lib/AllQuestions.svelte';
	import contractAbi from '../contracts/QuizFactory.json';
	const contractAddr = '<YOUR_CONTRACT_HERE>';
	export let web3Props = {
		provider: null,
		signer: null,
		account: null,
		chainId: null
	};
</script>

<h1>Welcome to My Quiz</h1>
{#if !web3Props.account}
	<WalletConnect bind:web3Props {contractAddr} {contractAbi} />
{:else}
	<AddQuestion bind:web3Props />
	<AllQuestions bind:web3Props />
{/if}
