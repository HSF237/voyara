/**
 * ISO country code → ISO currency code. Reference data that almost never
 * changes, bundled so it works offline and needs no API.
 */
const GROUPS: Record<string, string> = {
  EUR: 'AD AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MC ME MT NL PT SI SK SM VA XK GP MQ RE',
  USD: 'US EC SV PA PR GU VI AS MP FM MH PW TL TC VG BQ ZW',
  XOF: 'BJ BF CI GW ML NE SN TG',
  XAF: 'CM CF TD CG GQ GA',
  XCD: 'AG DM GD KN LC VC',
  XPF: 'PF NC',
  AUD: 'AU NR KI TV',
  NZD: 'NZ CK',
  GBP: 'GB GG JE IM',
  CHF: 'CH LI',
  DKK: 'DK GL FO',
  ILS: 'IL PS',
};

const SINGLES =
  'AE:AED AF:AFN AL:ALL AM:AMD AO:AOA AR:ARS AW:AWG AZ:AZN BA:BAM BB:BBD BD:BDT BH:BHD BI:BIF ' +
  'BM:BMD BN:BND BO:BOB BR:BRL BS:BSD BT:BTN BW:BWP BY:BYN BZ:BZD CA:CAD CD:CDF CL:CLP CN:CNY ' +
  'CO:COP CR:CRC CU:CUP CV:CVE CZ:CZK DJ:DJF DO:DOP DZ:DZD EG:EGP ER:ERN ET:ETB FJ:FJD GE:GEL ' +
  'GH:GHS GI:GIP GM:GMD GN:GNF GT:GTQ GY:GYD HK:HKD HN:HNL HT:HTG HU:HUF ID:IDR IN:INR IQ:IQD ' +
  'IR:IRR IS:ISK JM:JMD JO:JOD JP:JPY KE:KES KG:KGS KH:KHR KM:KMF KP:KPW KR:KRW KW:KWD KY:KYD ' +
  'KZ:KZT LA:LAK LB:LBP LK:LKR LR:LRD LS:LSL LY:LYD MA:MAD MD:MDL MG:MGA MK:MKD MM:MMK MN:MNT ' +
  'MO:MOP MR:MRU MU:MUR MV:MVR MW:MWK MX:MXN MY:MYR MZ:MZN NA:NAD NG:NGN NI:NIO NO:NOK NP:NPR ' +
  'OM:OMR PE:PEN PG:PGK PH:PHP PK:PKR PL:PLN PY:PYG QA:QAR RO:RON RS:RSD RU:RUB RW:RWF SA:SAR ' +
  'SB:SBD SC:SCR SD:SDG SE:SEK SG:SGD SL:SLE SO:SOS SR:SRD SS:SSP ST:STN SY:SYP SZ:SZL TH:THB ' +
  'TJ:TJS TM:TMT TN:TND TO:TOP TR:TRY TT:TTD TW:TWD TZ:TZS UA:UAH UG:UGX UY:UYU UZ:UZS VE:VES ' +
  'VN:VND VU:VUV WS:WST YE:YER ZA:ZAR ZM:ZMW';

const TABLE: Record<string, string> = {};
for (const [currency, countries] of Object.entries(GROUPS)) {
  for (const country of countries.split(' ')) TABLE[country] = currency;
}
for (const pair of SINGLES.split(' ')) {
  const [country, currency] = pair.split(':');
  if (country && currency) TABLE[country] = currency;
}

/** Currency used in a country, or undefined if the code is not recognised. */
export function currencyOfCountry(countryCode: string): string | undefined {
  return TABLE[countryCode.toUpperCase()];
}
