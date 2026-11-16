const headlineCountries = [
  {
    code: 840,
    name: "United States",
    lat: 39.5,
    lon: -98.35,
    headlines: [
      "Midwest weather system brings early-season snow",
      "Tech sector rallies as earnings beat expectations",
      "Local elections spotlight infrastructure funding",
      "New public transit line opens in major metro",
      "College basketball rivalry heads to overtime thriller",
    ],
  },
  {
    code: 826,
    name: "United Kingdom",
    lat: 54.8,
    lon: -2.6,
    headlines: [
      "Parliament debates energy price reforms",
      "London fintechs attract record seed funding",
      "Rail operators announce spring timetable changes",
      "Museum unveils lost Tudor-era artifacts",
      "Premier League title race tightens again",
    ],
  },
  {
    code: 250,
    name: "France",
    lat: 46.2,
    lon: 2.2,
    headlines: [
      "Regional farmers seek new drought protections",
      "Paris fashion week draws global buyers",
      "High-speed rail extension clears final review",
      "New cultural district opens in Lyon",
      "France cruises past rivals in six nations",
    ],
  },
  {
    code: 356,
    name: "India",
    lat: 22.3,
    lon: 78.9,
    headlines: [
      "Monsoon outlook revised with warmer ocean signals",
      "Mumbai startup launches low-cost satellite",
      "National highway upgrade hits key milestone",
      "Film festival celebrates regional cinema",
      "Cricket series set for decisive final match",
    ],
  },
  {
    code: 392,
    name: "Japan",
    lat: 36.2,
    lon: 138.2,
    headlines: [
      "Tokyo metro expands late-night service",
      "Yen steadies after central bank remarks",
      "Robotics expo highlights elder-care assistants",
      "Coastal town launches marine research center",
      "Baseball opener draws record attendance",
    ],
  },
  {
    code: 76,
    name: "Brazil",
    lat: -10.8,
    lon: -52.9,
    headlines: [
      "Amazon conservation pact secures new funding",
      "Sao Paulo transit upgrades cut commute times",
      "Coffee exporters eye new Asian markets",
      "Carnival season boosts tourism outlook",
      "Brazil advances to knockout stage",
    ],
  },
  {
    code: 710,
    name: "South Africa",
    lat: -30.6,
    lon: 22.9,
    headlines: [
      "Cape Town water resilience plan expands",
      "Renewable energy bids see strong turnout",
      "Startups spotlight township logistics",
      "Heritage site restoration enters final phase",
      "National team announces squad overhaul",
    ],
  },
  {
    code: 36,
    name: "Australia",
    lat: -25.3,
    lon: 133.8,
    headlines: [
      "Bushfire season readiness plan updated",
      "Sydney housing strategy aims at new supply",
      "Marine scientists map coral recovery",
      "Indie game studio wins global award",
      "Aussie rules finals draw record crowd",
    ],
  },
  {
    code: 566,
    name: "Nigeria",
    lat: 9.1,
    lon: 8.7,
    headlines: [
      "Lagos port automation cuts shipping delays",
      "Fintech regulation reforms gather support",
      "Northern states launch solar microgrid pilots",
      "Film industry export earnings hit new high",
      "National team readies for qualifier",
    ],
  },
  {
    code: 124,
    name: "Canada",
    lat: 56.1,
    lon: -106.3,
    headlines: [
      "Prairie provinces announce grain corridor upgrades",
      "Toronto tech corridor attracts new labs",
      "Arctic research station expands winter program",
      "Newfoundland ferry service adds routes",
      "Hockey tournament returns to historic arena",
    ],
  },
];

const byCode = new Map(headlineCountries.map((country) => [country.code, country]));

export const countries = headlineCountries;

export const getCountryByCode = (code) => byCode.get(Number(code)) ?? null;

export const buildCountryCatalogFromFeatures = (features) => {
  if (!Array.isArray(features)) return [...headlineCountries];

  return features.map((feature) => {
    const code = Number(feature.id);
    const matched = byCode.get(code);

    if (matched) {
      return matched;
    }

    return {
      code,
      name: feature.properties?.name ?? `Country ${code}`,
      headlines: [],
    };
  });
};
