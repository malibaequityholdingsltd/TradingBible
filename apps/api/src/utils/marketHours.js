// Market-hours truth for spot instruments. Crypto trades 24/7; metals,
// forex, indices and stocks close on weekends (Sat all day, Sun before the
// ~22:00 UTC futures/forex reopen). During closure the feed must freeze the
// last real close — never invent drift — so quotes/candles stay honest.
export function isWeekendClosed(symbol, cryptoMap = null) {
	const isCrypto = cryptoMap ? Boolean(cryptoMap[symbol]) : false;
	// Crypto (incl. PAXG spot gold) trades 24/7 — never frozen.
	if (isCrypto) return false;
	const d = new Date();
	const day = d.getUTCDay();
	const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
	if (day === 6) return true;
	if (day === 0 && hour < 22) return true;
	return false;
}
