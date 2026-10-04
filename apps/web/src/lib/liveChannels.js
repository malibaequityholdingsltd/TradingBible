// TradingBible TV — curated live channel guide (Bloomberg live desks).
// Bloomberg's live pages are DRM/bot protected with no public embed or
// restream URL, so page-URL channels open on bloomberg.com in a new tab —
// we do not hotlink or rebroadcast their streams. Entries with an `embedUrl`
// (official YouTube live embed) play directly inside the widget, no login.

export const LIVE_CHANNELS = [
	{
		id: 'bloomberg-yt-live',
		title: 'Bloomberg TV — YouTube Live',
		desk: 'Global',
		url: 'https://www.youtube.com/@markets/live',
		embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCIALMKvObZNtJ6AmdCLP7Lg&autoplay=1',
		blurb: 'Official 24/7 stream — plays instantly in the widget, no login.',
		isNew: true,
	},
	{
		id: 'bloomberg-europe',
		title: 'Bloomberg Europe',
		desk: 'Europe',
		url: 'https://www.bloomberg.com/live/europe',
		blurb: 'Live European market coverage — London open, ECB, EU movers.',
	},
	{
		id: 'bloomberg-us',
		title: 'Bloomberg US',
		desk: 'Americas',
		url: 'https://www.bloomberg.com/live/us',
		blurb: 'Live US market coverage — Wall Street open, Fed, earnings.',
	},
	{
		id: 'bloomberg-us-btv',
		title: 'Bloomberg TV US',
		desk: 'Americas',
		url: 'https://www.bloomberg.com/live/us-btv',
		blurb: 'Bloomberg Television US broadcast stream.',
	},
	{
		id: 'bloomberg-asia',
		title: 'Bloomberg Asia',
		desk: 'Asia',
		url: 'https://www.bloomberg.com/live/asia',
		blurb: 'Live Asian market coverage — Tokyo, Hong Kong, Shanghai.',
	},
	{
		id: 'bloomberg-asia-stream',
		title: 'Bloomberg Asia Stream',
		desk: 'Asia',
		url: 'https://www.bloomberg.com/live/asia_stream',
		blurb: 'Second Asia live stream — overnight markets and analysis.',
	},
	{
		id: 'bloomberg-australia',
		title: 'Bloomberg Australia',
		desk: 'Asia Pacific',
		url: 'https://www.bloomberg.com/live/australia',
		blurb: 'Australian market coverage — ASX open, RBA, Pacific news.',
	},
	{
		id: 'bloomberg-emea',
		title: 'Bloomberg EMEA',
		desk: 'EMEA',
		url: 'https://www.bloomberg.com/live/emea',
		blurb: 'Europe, Middle East & Africa — Gulf markets, commodities.',
	},
	{
		id: 'bloomberg-stream',
		title: 'Bloomberg Live Stream',
		desk: 'Global',
		url: 'https://www.bloomberg.com/live/stream',
		blurb: 'Main global live stream — rolling business news 24/7.',
	},
	{
		id: 'bloomberg-originals',
		title: 'Bloomberg Originals',
		desk: 'Originals',
		url: 'https://www.bloomberg.com/live/originals',
		blurb: 'Originals channel — documentaries, interviews, features.',
	},
	{
		id: 'bloomberg-politics',
		title: 'Bloomberg Politics',
		desk: 'Politics',
		url: 'https://www.bloomberg.com/live/politics',
		blurb: 'Policy and politics driving markets — elections, regulation.',
	},
	{
		id: 'bloomberg-radio',
		title: 'Bloomberg Radio',
		desk: 'Audio',
		url: 'https://www.bloomberg.com/live/radio',
		blurb: 'Audio stream — markets and analysis, listen anywhere.',
	},
	{
		id: 'bloomberg-subscriber-event',
		title: 'Bloomberg Subscriber Event',
		desk: 'Events',
		url: 'https://www.bloomberg.com/live/subscriber-event',
		blurb: 'Live subscriber events — summits, interviews, specials.',
		isNew: true,
	},
];

export function openLiveChannel(url) {
	window.open(url, '_blank', 'noopener');
}
