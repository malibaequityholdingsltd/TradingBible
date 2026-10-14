// International phone field — dial-code select covering all area codes
// plus a local-number input. Always stores/returns the full E.164-ish
// string ("+96551234567"). Existing values are split gracefully: a known
// leading code is detected, otherwise the default code prefixes digits.
import React from 'react';

export const DIAL_CODES = [
  ['+1', 'US/CA +1'], ['+7', 'KZ/RU +7'], ['+20', 'EG +20'], ['+27', 'ZA +27'],
  ['+30', 'GR +30'], ['+31', 'NL +31'], ['+32', 'BE +32'], ['+33', 'FR +33'],
  ['+34', 'ES +34'], ['+39', 'IT +39'], ['+40', 'RO +40'], ['+41', 'CH +41'],
  ['+43', 'AT +43'], ['+44', 'UK +44'], ['+45', 'DK +45'], ['+46', 'SE +46'],
  ['+47', 'NO +47'], ['+48', 'PL +48'], ['+49', 'DE +49'], ['+52', 'MX +52'],
  ['+53', 'CU +53'], ['+54', 'AR +54'], ['+55', 'BR +55'], ['+56', 'CL +56'],
  ['+57', 'CO +57'], ['+58', 'VE +58'], ['+60', 'MY +60'], ['+61', 'AU +61'],
  ['+62', 'ID +62'], ['+63', 'PH +63'], ['+64', 'NZ +64'], ['+65', 'SG +65'],
  ['+66', 'TH +66'], ['+81', 'JP +81'], ['+82', 'KR +82'], ['+84', 'VN +84'],
  ['+86', 'CN +86'], ['+90', 'TR +90'], ['+91', 'IN +91'], ['+92', 'PK +92'],
  ['+93', 'AF +93'], ['+94', 'LK +94'], ['+95', 'MM +95'], ['+98', 'IR +98'],
  ['+211', 'SS +211'], ['+212', 'MA +212'], ['+213', 'DZ +213'], ['+216', 'TN +216'],
  ['+218', 'LY +218'], ['+220', 'GM +220'], ['+221', 'SN +221'], ['+222', 'MR +222'],
  ['+223', 'ML +223'], ['+224', 'GN +224'], ['+225', 'CI +225'], ['+226', 'BF +226'],
  ['+227', 'NE +227'], ['+228', 'TG +228'], ['+229', 'BJ +229'], ['+230', 'MU +230'],
  ['+231', 'LR +231'], ['+232', 'SL +232'], ['+233', 'GH +233'], ['+234', 'NG +234'],
  ['+235', 'TD +235'], ['+236', 'CF +236'], ['+237', 'CM +237'], ['+238', 'CV +238'],
  ['+239', 'ST +239'], ['+240', 'GQ +240'], ['+241', 'GA +241'], ['+242', 'CG +242'],
  ['+243', 'CD +243'], ['+244', 'AO +244'], ['+245', 'GW +245'], ['+246', 'IO +246'],
  ['+248', 'SC +248'], ['+249', 'SD +249'], ['+250', 'RW +250'], ['+251', 'ET +251'],
  ['+252', 'SO +252'], ['+253', 'DJ +253'], ['+254', 'KE +254'], ['+255', 'TZ +255'],
  ['+256', 'UG +256'], ['+257', 'BI +257'], ['+258', 'MZ +258'], ['+260', 'ZM +260'],
  ['+261', 'MG +261'], ['+262', 'RE +262'], ['+263', 'ZW +263'], ['+264', 'NA +264'],
  ['+265', 'MW +265'], ['+266', 'LS +266'], ['+267', 'BW +267'], ['+268', 'SZ +268'],
  ['+269', 'KM +269'], ['+290', 'SH +290'], ['+291', 'ER +291'], ['+297', 'AW +297'],
  ['+298', 'FO +298'], ['+299', 'GL +299'], ['+350', 'GI +350'], ['+351', 'PT +351'],
  ['+352', 'LU +352'], ['+353', 'IE +353'], ['+354', 'IS +354'], ['+355', 'AL +355'],
  ['+356', 'MT +356'], ['+357', 'CY +357'], ['+358', 'FI +358'], ['+359', 'BG +359'],
  ['+370', 'LT +370'], ['+371', 'LV +371'], ['+372', 'EE +372'], ['+373', 'MD +373'],
  ['+374', 'AM +374'], ['+375', 'BY +375'], ['+376', 'AD +376'], ['+377', 'MC +377'],
  ['+378', 'SM +378'], ['+380', 'UA +380'], ['+381', 'RS +381'], ['+382', 'ME +382'],
  ['+383', 'XK +383'], ['+385', 'HR +385'], ['+386', 'SI +386'], ['+387', 'BA +387'],
  ['+389', 'MK +389'], ['+420', 'CZ +420'], ['+421', 'SK +421'], ['+423', 'LI +423'],
  ['+502', 'GT +502'], ['+503', 'SV +503'], ['+504', 'HN +504'], ['+505', 'NI +505'],
  ['+506', 'CR +506'], ['+507', 'PA +507'], ['+508', 'PM +508'], ['+509', 'HT +509'],
  ['+590', 'GP +590'], ['+591', 'BO +591'], ['+592', 'GY +592'], ['+593', 'EC +593'],
  ['+594', 'GF +594'], ['+595', 'PY +595'], ['+596', 'MQ +596'], ['+597', 'SR +597'],
  ['+598', 'UY +598'], ['+599', 'CW +599'], ['+677', 'SB +677'], ['+678', 'VU +678'],
  ['+679', 'FJ +679'], ['+680', 'PW +680'], ['+681', 'WF +681'], ['+682', 'CK +682'],
  ['+683', 'NU +683'], ['+685', 'WS +685'], ['+686', 'KI +686'], ['+687', 'NC +687'],
  ['+688', 'TV +688'], ['+689', 'PF +689'], ['+690', 'TK +690'], ['+691', 'FM +691'],
  ['+692', 'MH +692'], ['+852', 'HK +852'], ['+853', 'MO +853'], ['+855', 'KH +855'],
  ['+856', 'LA +856'], ['+880', 'BD +880'], ['+886', 'TW +886'], ['+960', 'MV +960'],
  ['+961', 'LB +961'], ['+962', 'JO +962'], ['+963', 'SY +963'], ['+964', 'IQ +964'],
  ['+965', 'KW +965'], ['+966', 'SA +966'], ['+967', 'YE +967'], ['+968', 'OM +968'],
  ['+970', 'PS +970'], ['+971', 'AE +971'], ['+972', 'IL +972'], ['+973', 'BH +973'],
  ['+974', 'QA +974'], ['+975', 'BT +975'], ['+976', 'MN +976'], ['+977', 'NP +977'],
  ['+992', 'TJ +992'], ['+993', 'TM +993'], ['+994', 'AZ +994'], ['+995', 'GE +995'],
  ['+996', 'KG +996'], ['+998', 'UZ +998'],
];

const SORTED = [...DIAL_CODES].sort((a, b) => b[0].length - a[0].length);

export function splitPhone(full, fallbackCode = '+1') {
  const clean = String(full || '').replace(/[\s()-]/g, '');
  if (clean.startsWith('+')) {
    const hit = SORTED.find(([c]) => clean.startsWith(c));
    if (hit) return { code: hit[0], local: clean.slice(hit[0].length) };
    const m = clean.match(/^(\+\d{1,4})(\d+)$/);
    if (m) return { code: m[1], local: m[2] };
    return { code: fallbackCode, local: clean.replace(/^\+/, '') };
  }
  return { code: fallbackCode, local: clean.replace(/\D/g, '') };
}

export function joinPhone(code, local) {
  const digits = String(local || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${code || '+1'}${digits}`;
}

export default function PhoneField({
  value, onChange, fallbackCode = '+1', inputClassName = '', selectClassName = '',
  placeholder = '512 345 678', autoComplete = 'tel', disabled = false, id,
}) {
  const { code, local } = splitPhone(value, fallbackCode);
  const known = DIAL_CODES.some(([c]) => c === code);
  const options = known ? DIAL_CODES : [[code, `${code}`], ...DIAL_CODES];
  return (
    <div className="flex min-w-0 gap-2">
      <select
        value={code}
        onChange={(e) => onChange(joinPhone(e.target.value, local))}
        aria-label="Country code"
        disabled={disabled}
        className={`w-[7.5rem] shrink-0 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-2 py-2.5 font-mono text-sm text-[#e9e7df] outline-none focus:border-[#d4af37]/50 ${selectClassName}`}
      >
        {options.map(([c, label]) => <option key={c} value={c} className="bg-[#0f0f14]">{label}</option>)}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={local}
        onChange={(e) => onChange(joinPhone(code, e.target.value))}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className={`min-w-0 flex-1 rounded-xl border border-[#d4af37]/15 bg-[#0f0f14] px-3 py-2.5 font-mono text-sm text-[#e9e7df] placeholder-[#6a665a] outline-none focus:border-[#d4af37]/50 ${inputClassName}`}
      />
    </div>
  );
}
