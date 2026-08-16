// Nepal district → 3-letter abbreviation map
// Used for auto-generating coverage location and branch codes.

const NEPAL_DISTRICT_ABBR = {
  // Bagmati Province
  kathmandu: "KTM",
  lalitpur: "LTP",
  bhaktapur: "BKT",
  kavrepalanchok: "KVR",
  sindhupalchok: "SPL",
  sindhuli: "SDL",
  ramechhap: "RMP",
  dolakha: "DLK",
  nuwakot: "NWT",
  rasuwa: "RSW",
  dhading: "DHD",
  makwanpur: "MKP",
  chitwan: "CTW",

  // Gandaki Province
  kaski: "PKR",
  pokhara: "PKR",
  tanahun: "TNH",
  syangja: "SYJ",
  lamjung: "LMJ",
  gorkha: "GRK",
  manang: "MNG",
  mustang: "MST",
  myagdi: "MYG",
  parbat: "PRB",
  baglung: "BGL",
  nawalpur: "NWP",

  // Koshi Province
  morang: "MRG",
  biratnagar: "BTN",
  sunsari: "SNS",
  dhankuta: "DNK",
  terhathum: "TRT",
  sankhuwasabha: "SKS",
  bhojpur: "BJP",
  solukhumbu: "SLK",
  okhaldhunga: "OKH",
  khotang: "KHT",
  udayapur: "UDP",
  taplejung: "TPL",
  panchthar: "PCT",
  ilam: "ILM",
  jhapa: "JHP",

  // Madhesh Province
  saptari: "SPT",
  siraha: "SRH",
  dhanusha: "DNS",
  mahottari: "MHT",
  sarlahi: "SRL",
  rautahat: "RTH",
  bara: "BRA",
  parsa: "PRS",
  birgunj: "BGJ",

  // Lumbini Province
  rupandehi: "RPD",
  butwal: "BTW",
  bhairahawa: "BHW",
  kapilvastu: "KPV",
  palpa: "PLP",
  arghakhanchi: "AGK",
  gulmi: "GLM",
  dang: "DNG",
  banke: "BNK",
  nepalgunj: "NPG",
  bardiya: "BRD",
  rolpa: "RLP",
  pyuthan: "PYT",
  "rukum east": "RKE",

  // Karnali Province
  surkhet: "SKT",
  birendranagar: "BRN",
  dailekh: "DLH",
  jajarkot: "JJK",
  dolpa: "DLP",
  jumla: "JML",
  mugu: "MGU",
  humla: "HML",
  kalikot: "KLK",
  salyan: "SLN",
  "rukum west": "RKW",

  // Sudurpashchim Province
  kailali: "KLL",
  dhangadhi: "DHG",
  kanchanpur: "KCP",
  mahendranagar: "MHN",
  dadeldhura: "DDH",
  baitadi: "BTD",
  darchula: "DCL",
  achham: "ACH",
  doti: "DTI",
  bajura: "BJR",
  bajhang: "BJH",
};

/**
 * Get 3-letter abbreviation for a district/city name.
 * Falls back to first 3 uppercase letters of the first word.
 */
export function getDistrictAbbr(name) {
  if (!name) return "LOC";
  const key = String(name).trim().toLowerCase();
  if (NEPAL_DISTRICT_ABBR[key]) return NEPAL_DISTRICT_ABBR[key];
  // fallback: first 3 alpha chars of first word
  const firstWord = key.split(/\s+/)[0].replace(/[^a-z]/g, "");
  return firstWord.slice(0, 3).toUpperCase() || "LOC";
}

/**
 * Generate coverage location code.
 * main: TUK-KTM-MAIN
 * sub:  TUK-KTM-SUB-KOTESHWOR
 */
export function makeCoverageCode(name, type) {
  if (!name) return "";
  const abbr = getDistrictAbbr(name);
  const words = String(name)
    .trim()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .filter(Boolean);

  if (type === "main_branch_zone") {
    return `TUK-${abbr}-MAIN`;
  }

  // For sub: use words after the first as the area name
  const area = words.slice(1).join("-") || words[0];
  return `TUK-${abbr}-SUB-${area}`;
}
