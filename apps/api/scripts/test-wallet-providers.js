import { getBalance, withUsdValue, NETWORKS } from '../src/utils/walletData.js';

const cases = [
	['bitcoin', '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
	['ethereum', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
	['usdc-ethereum', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
	['usdc-base', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
	['usdc-polygon', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
	['usdt-ethereum', '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'],
	['solana', '11111111111111111111111111111111'],
];

for (const [net, addr] of cases) {
	const b = await getBalance(net, addr);
	const v = b.ok ? await withUsdValue(b, NETWORKS[net]) : b;
	console.log(net.padEnd(15), v.ok ? `${v.amount} ${NETWORKS[net].currency} ≈ $${v.usdValue.toFixed(2)}` : `ERROR: ${v.error}`);
}
process.exit(0);
