<script>
    import { onMount } from "svelte";
    import { getETHPrice } from "../utils/getETHPrice";
    let value;
    onMount(async () => {
        value = await getETHPrice();
    });
</script>

<h1>Current ETH Price in USD</h1>
<p>
    $ {(1 * value).toFixed(2)} USD
</p>
