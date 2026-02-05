/**
 * NTA (Neighborhood Tabulation Area) to Neighborhood Name Mapping
 * Maps NYC Open Data NTA codes to human-readable neighborhood names
 *
 * NTA codes format: 2-letter borough prefix + 2-digit number
 * - MN = Manhattan
 * - BK = Brooklyn
 * - QN = Queens
 * - BX = Bronx
 * - SI = Staten Island
 */

// Manhattan neighborhoods
const MANHATTAN_NTA: Record<string, string> = {
  'MN01': 'Marble Hill-Inwood',
  'MN03': 'Central Harlem North',
  'MN04': 'Hamilton Heights',
  'MN06': 'Manhattanville',
  'MN09': 'Morningside Heights',
  'MN11': 'Central Harlem South',
  'MN12': 'Upper West Side',
  'MN13': 'East Village', // Includes parts of NoHo
  'MN14': 'Lincoln Square',
  'MN15': 'Clinton',
  'MN17': 'Midtown-Midtown South',
  'MN19': 'Turtle Bay-East Midtown',
  'MN20': 'Murray Hill-Kips Bay',
  'MN21': 'Gramercy',
  'MN22': 'East Harlem South',
  'MN23': 'West Village',
  'MN24': 'SoHo-TriBeCa-Civic Center-Little Italy',
  'MN25': 'Battery Park City-Lower Manhattan',
  'MN27': 'Chinatown',
  'MN28': 'Lower East Side',
  'MN31': 'Lenox Hill-Roosevelt Island',
  'MN32': 'Yorkville',
  'MN33': 'East Harlem North',
  'MN34': 'East Midtown-Turtle Bay',
  'MN35': 'Upper East Side-Carnegie Hill',
  'MN36': 'Stuyvesant Town-Cooper Village',
  'MN40': 'Upper West Side',
  'MN50': 'Hudson Yards-Chelsea-Flat Iron-Union Square',
}

// Brooklyn neighborhoods
const BROOKLYN_NTA: Record<string, string> = {
  'BK09': 'Brooklyn Heights-Cobble Hill',
  'BK17': 'Sheepshead Bay-Gerritsen Beach-Manhattan Beach',
  'BK19': 'Brighton Beach',
  'BK21': 'Seagate-Coney Island',
  'BK23': 'West Brighton',
  'BK25': 'Homecrest',
  'BK26': 'Gravesend',
  'BK27': 'Bath Beach',
  'BK28': 'Bensonhurst West',
  'BK29': 'Bensonhurst East',
  'BK30': 'Dyker Heights',
  'BK31': 'Bay Ridge',
  'BK32': 'Sunset Park West',
  'BK33': 'Carroll Gardens-Columbia Street-Red Hook',
  'BK34': 'Sunset Park East',
  'BK35': 'Starrett City',
  'BK37': 'Borough Park',
  'BK38': 'Midwood',
  'BK40': 'Windsor Terrace',
  'BK41': 'Kensington-Ocean Parkway',
  'BK42': 'Flatbush',
  'BK43': 'Midwood',
  'BK44': 'Madison',
  'BK45': 'Georgetown-Marine Park-Bergen Beach-Mill Basin',
  'BK46': 'Ocean Hill',
  'BK50': 'Canarsie',
  'BK58': 'Flatlands',
  'BK60': 'Prospect Lefferts Gardens-Wingate',
  'BK61': 'Crown Heights North',
  'BK63': 'Cypress Hills-City Line',
  'BK64': 'Brownsville',
  'BK68': 'Fort Greene',
  'BK69': 'Clinton Hill',
  'BK72': 'Prospect Heights',
  'BK73': 'North Side-South Side',
  'BK75': 'Bedford',
  'BK76': 'Greenpoint',
  'BK77': 'Bushwick South',
  'BK78': 'Bushwick North',
  'BK79': 'Ocean Parkway South',
  'BK81': 'Brownsville',
  'BK82': 'East Flatbush-Farragut',
  'BK83': 'Flatbush',
  'BK85': 'DUMBO-Vinegar Hill-Downtown Brooklyn-Boerum Hill',
  'BK88': 'Stuyvesant Heights',
  'BK90': 'East New York',
  'BK91': 'East New York (Pennsylvania Ave)',
  'BK93': 'East Williamsburg',
  'BK95': 'Erasmus',
  'BK96': 'Rugby-Remsen Village',
  'BK99': 'Park Slope-Gowanus',
}

// Queens neighborhoods
const QUEENS_NTA: Record<string, string> = {
  'QN01': 'South Jamaica',
  'QN02': 'Springfield Gardens North',
  'QN03': 'Springfield Gardens South-Brookville',
  'QN05': 'Cambria Heights',
  'QN06': 'Laurelton',
  'QN07': 'Hollis',
  'QN08': 'St. Albans',
  'QN10': 'Breezy Point-Belle Harbor-Rockaway Park-Broad Channel',
  'QN12': 'Jamaica',
  'QN15': 'Far Rockaway-Bayswater',
  'QN17': 'Hammels-Arverne-Edgemere',
  'QN18': 'North Corona',
  'QN19': 'South Corona',
  'QN20': 'Flushing',
  'QN21': 'Auburndale',
  'QN22': 'Flushing',
  'QN23': 'College Point',
  'QN25': 'Whitestone',
  'QN26': 'Bayside-Bayside Hills',
  'QN27': 'East Flushing',
  'QN28': 'Fresh Meadows-Utopia',
  'QN29': 'Hillcrest',
  'QN30': 'Pomonok-Flushing Heights-Hillcrest',
  'QN31': 'Hunters Point-Sunnyside-West Maspeth',
  'QN33': 'Woodside',
  'QN34': 'Jackson Heights',
  'QN35': 'Elmhurst',
  'QN37': 'Rego Park',
  'QN38': 'Briarwood-Jamaica Hills',
  'QN41': 'Jamaica Estates-Holliswood',
  'QN42': 'Kew Gardens Hills',
  'QN43': 'Bellerose',
  'QN44': 'Glen Oaks-Floral Park-New Hyde Park',
  'QN45': 'Queens Village',
  'QN46': 'Oakland Gardens',
  'QN47': 'Little Neck-Douglaston',
  'QN48': 'Glendale',
  'QN49': 'Middle Village',
  'QN50': 'Maspeth',
  'QN51': 'Murray Hill',
  'QN52': 'East Elmhurst',
  'QN53': 'Woodhaven',
  'QN54': 'Richmond Hill',
  'QN55': 'South Ozone Park',
  'QN56': 'Ozone Park',
  'QN57': 'Howard Beach',
  'QN60': 'Old Astoria',
  'QN61': 'Ridgewood',
  'QN62': 'Forest Hills',
  'QN63': 'Kew Gardens',
  'QN66': 'Astoria',
  'QN68': 'Steinway',
  'QN70': 'Queensbridge-Ravenswood-Long Island City',
  'QN71': 'Elmhurst-Maspeth',
  'QN72': 'Lindenwood-Howard Beach',
  'QN76': 'Rosedale',
  'QN98': 'Jamaica',
  'QN99': 'Airport',
}

// Bronx neighborhoods
const BRONX_NTA: Record<string, string> = {
  'BX01': 'Claremont-Bathgate',
  'BX03': 'Eastchester-Edenwald-Baychester',
  'BX05': 'Bedford Park-Fordham North',
  'BX06': 'Belmont',
  'BX07': 'Bronxdale',
  'BX08': 'West Farms-Bronx River',
  'BX09': 'Soundview-Castle Hill-Clason Point-Harding Park',
  'BX10': 'Pelham Parkway',
  'BX13': 'Co-op City',
  'BX14': 'East Concourse-Concourse Village',
  'BX17': 'East Tremont',
  'BX22': 'North Riverdale-Fieldston-Riverdale',
  'BX26': 'Highbridge',
  'BX27': 'Hunts Point',
  'BX28': 'Van Cortlandt Village',
  'BX29': 'Kingsbridge',
  'BX30': 'Kingsbridge Heights',
  'BX31': 'Allerton-Pelham Gardens',
  'BX33': 'Longwood',
  'BX34': 'Melrose South-Mott Haven North',
  'BX35': 'Morrisania-Melrose',
  'BX36': 'University Heights-Morris Heights',
  'BX37': 'Van Nest-Morris Park-Westchester Square',
  'BX39': 'Mott Haven-Port Morris',
  'BX40': 'Mount Hope',
  'BX41': 'Mount Eden-Claremont (West)',
  'BX43': 'Norwood',
  'BX44': 'Williamsbridge-Olinville',
  'BX46': 'Parkchester',
  'BX49': 'Pelham Bay-Country Club-City Island',
  'BX52': 'Schuylerville-Throgs Neck-Edgewater Park',
  'BX55': 'Soundview-Bruckner',
  'BX59': 'Concourse',
  'BX62': 'Wakefield-Woodlawn',
  'BX63': 'West Concourse',
  'BX75': 'Crotona Park East',
  'BX98': 'Rikers Island',
  'BX99': 'Woodlawn Cemetery',
}

// Staten Island neighborhoods
const STATEN_ISLAND_NTA: Record<string, string> = {
  'SI01': 'Annadale-Huguenot-Prince\'s Bay-Eltingville',
  'SI05': 'Arden Heights',
  'SI07': 'Westerleigh',
  'SI08': 'Grymes Hill-Clifton-Fox Hills',
  'SI11': 'Charleston-Richmond Valley-Tottenville',
  'SI12': 'Mariner\'s Harbor-Arlington-Port Ivory-Graniteville',
  'SI14': 'Grasmere-Arrochar-Ft. Wadsworth',
  'SI22': 'New Springville-Bloomfield-Travis',
  'SI24': 'Todt Hill-Emerson Hill-Heartland Village-Lighthouse Hill',
  'SI25': 'Oakwood-Oakwood Beach',
  'SI28': 'Port Richmond',
  'SI32': 'Rossville-Woodrow',
  'SI35': 'New Brighton-Silver Lake',
  'SI36': 'Stapleton-Rosebank',
  'SI37': 'Tottenville-Eltingville-Annadale-Rossville',
  'SI45': 'New Dorp-Midland Beach',
  'SI48': 'West New Brighton-New Brighton-St. George',
  'SI54': 'Great Kills',
}

// Combined NTA mapping
export const NTA_TO_NEIGHBORHOOD: Record<string, string> = {
  ...MANHATTAN_NTA,
  ...BROOKLYN_NTA,
  ...QUEENS_NTA,
  ...BRONX_NTA,
  ...STATEN_ISLAND_NTA,
}

// Borough code to full name
export const BORO_CODE_TO_NAME: Record<string, string> = {
  'Manhattan': 'Manhattan',
  'Brooklyn': 'Brooklyn',
  'Queens': 'Queens',
  'Bronx': 'Bronx',
  'Staten Island': 'Staten Island',
  // Short codes
  'MN': 'Manhattan',
  'BK': 'Brooklyn',
  'QN': 'Queens',
  'BX': 'Bronx',
  'SI': 'Staten Island',
}

/**
 * Map NTA code to neighborhood name
 * Falls back to borough name if NTA not found
 */
export function mapNTAToNeighborhood(nta: string | undefined, boro?: string): string | undefined {
  if (!nta) return boro ? BORO_CODE_TO_NAME[boro] || boro : undefined

  const neighborhood = NTA_TO_NEIGHBORHOOD[nta]
  if (neighborhood) return neighborhood

  // Try to extract borough from NTA prefix and return generic
  const prefix = nta.substring(0, 2)
  const boroName = BORO_CODE_TO_NAME[prefix]
  if (boroName) return boroName

  return boro ? BORO_CODE_TO_NAME[boro] || boro : undefined
}

/**
 * Get borough from NTA code
 */
export function getBoroughFromNTA(nta: string): string | undefined {
  if (!nta || nta.length < 2) return undefined
  const prefix = nta.substring(0, 2)
  return BORO_CODE_TO_NAME[prefix]
}
