// TradingBible TV — provider directory.
//
// This is a reference catalogue, not a rebroadcast list. These providers and
// streaming services are controlled by their own operators; TradingBible
// lists them so members can see what is available in the market. Availability
// and channel line-ups change by country, package and date.
//
// `status` is only set where the user-facing source list gives one:
//   inactive   — service is not currently operating
//   uncertain  — availability is not confirmed
//   restricted — service is region restricted
export const TV_PROVIDERS = [
  { no: 1, name: 'DStv', type: 'Satellite TV' },
  { no: 2, name: 'GOtv', type: 'Digital TV' },
  { no: 3, name: 'StarTimes', type: 'Satellite and digital TV' },
  { no: 4, name: 'SLTV (Metro Digital)', type: 'Satellite TV' },
  { no: 5, name: 'TStv Africa', type: 'Satellite TV', status: 'inactive' },
  { no: 6, name: 'Luft Pay TV', type: 'Pay TV', status: 'uncertain' },
  { no: 7, name: 'FreeTV Nigeria', type: 'Free digital TV' },
  { no: 8, name: 'Strong TV / Free-to-Air', type: 'Free satellite channels' },
  { no: 9, name: 'Canal+', type: 'Satellite and pay TV' },
  { no: 10, name: 'Zuku TV', type: 'Satellite and cable TV' },
  { no: 11, name: 'Azam TV', type: 'Satellite TV' },
  { no: 12, name: 'StarSat', type: 'Satellite TV' },
  { no: 13, name: 'Openview', type: 'Free satellite TV' },
  { no: 14, name: 'Metro Digital TV', type: 'Digital pay TV' },
  { no: 15, name: 'Consat TV', type: 'Satellite TV' },
];

export const TV_STREAMING_SERVICES = [
  { no: 16, name: 'Netflix', type: 'Streaming service' },
  { no: 17, name: 'Amazon Prime Video', type: 'Streaming service' },
  { no: 18, name: 'DStv Stream', type: 'Streaming service' },
  { no: 19, name: 'StarTimes ON', type: 'Streaming service' },
  { no: 20, name: 'YouTube TV', type: 'Streaming service', status: 'restricted' },
  { no: 21, name: 'Apple TV', type: 'Streaming service' },
  { no: 22, name: 'Pluto TV', type: 'Streaming service', status: 'restricted' },
];

export const TV_PROVIDER_STATUS = {
  inactive: 'tv.inactive',
  uncertain: 'tv.uncertain',
  restricted: 'tv.regionRestricted',
};
