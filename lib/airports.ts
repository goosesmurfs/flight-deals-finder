export type DestinationCategory = 'beach' | 'city' | 'mountain' | 'entertainment' | 'historic' | 'adventure';

export interface Airport {
  code: string;
  city: string;
  state: string;
  name: string;
  categories?: DestinationCategory[];
}

export const ORIGIN_AIRPORT = {
  code: 'IND',
  city: 'Indianapolis',
  state: 'IN',
  name: 'Indianapolis International Airport'
};

export const DESTINATION_AIRPORTS: Airport[] = [
  { code: 'ACY', city: 'Atlantic City', state: 'NJ', name: 'Atlantic City International Airport', categories: ['beach', 'entertainment'] },
  { code: 'ATL', city: 'Atlanta', state: 'GA', name: 'Hartsfield-Jackson Atlanta International Airport', categories: ['city'] },
  { code: 'RDU', city: 'Raleigh', state: 'NC', name: 'Raleigh-Durham International Airport', categories: ['city'] },
  { code: 'MCO', city: 'Orlando', state: 'FL', name: 'Orlando International Airport', categories: ['beach', 'entertainment'] },
  { code: 'TPA', city: 'Tampa', state: 'FL', name: 'Tampa International Airport', categories: ['beach', 'city'] },
  { code: 'DFW', city: 'Dallas/Fort Worth', state: 'TX', name: 'Dallas/Fort Worth International Airport', categories: ['city'] },
  { code: 'AUS', city: 'Austin', state: 'TX', name: 'Austin-Bergstrom International Airport', categories: ['city', 'entertainment'] },
  { code: 'JFK', city: 'New York', state: 'NY', name: 'John F. Kennedy International Airport', categories: ['city', 'historic'] },
  { code: 'FLL', city: 'Fort Lauderdale', state: 'FL', name: 'Fort Lauderdale-Hollywood International Airport', categories: ['beach'] },
  { code: 'MIA', city: 'Miami', state: 'FL', name: 'Miami International Airport', categories: ['beach', 'city'] },
  { code: 'EWR', city: 'Newark', state: 'NJ', name: 'Newark Liberty International Airport', categories: ['city'] },
  { code: 'BWI', city: 'Baltimore/Washington', state: 'DC', name: 'Baltimore/Washington International Airport', categories: ['city', 'historic'] },
  { code: 'PHL', city: 'Philadelphia', state: 'PA', name: 'Philadelphia International Airport', categories: ['city', 'historic'] },
  { code: 'CLT', city: 'Charlotte', state: 'NC', name: 'Charlotte Douglas International Airport', categories: ['city'] },
  { code: 'BNA', city: 'Nashville', state: 'TN', name: 'Nashville International Airport', categories: ['city', 'entertainment'] },
  { code: 'DTW', city: 'Detroit', state: 'MI', name: 'Detroit Metropolitan Wayne County Airport', categories: ['city'] },
  { code: 'CLE', city: 'Cleveland', state: 'OH', name: 'Cleveland Hopkins International Airport', categories: ['city'] },
  { code: 'PIT', city: 'Pittsburgh', state: 'PA', name: 'Pittsburgh International Airport', categories: ['city'] },
  { code: 'CMH', city: 'Columbus', state: 'OH', name: 'John Glenn Columbus International Airport', categories: ['city'] },
  { code: 'CVG', city: 'Cincinnati', state: 'OH', name: 'Cincinnati/Northern Kentucky International Airport', categories: ['city'] },
  { code: 'STL', city: 'St. Louis', state: 'MO', name: 'St. Louis Lambert International Airport', categories: ['city', 'historic'] },
  { code: 'LAS', city: 'Las Vegas', state: 'NV', name: 'Harry Reid International Airport', categories: ['entertainment', 'city'] },
  { code: 'DEN', city: 'Denver', state: 'CO', name: 'Denver International Airport', categories: ['city', 'mountain', 'adventure'] },
  { code: 'CUN', city: 'Cancún', state: 'Mexico', name: 'Cancún International Airport', categories: ['beach', 'entertainment'] },
  { code: 'PHX', city: 'Phoenix', state: 'AZ', name: 'Phoenix Sky Harbor International Airport', categories: ['city', 'mountain'] },
  { code: 'PGD', city: 'Punta Gorda/Fort Myers', state: 'FL', name: 'Punta Gorda Airport', categories: ['beach'] },
  { code: 'SRQ', city: 'Sarasota/Bradenton', state: 'FL', name: 'Sarasota-Bradenton International Airport', categories: ['beach'] },
  { code: 'JAX', city: 'Jacksonville', state: 'FL', name: 'Jacksonville International Airport', categories: ['beach', 'city'] },
  { code: 'VPS', city: 'Destin/Fort Walton Beach', state: 'FL', name: 'Destin-Fort Walton Beach Airport', categories: ['beach'] },
  { code: 'PBI', city: 'West Palm Beach', state: 'FL', name: 'Palm Beach International Airport', categories: ['beach'] },
  { code: 'EYW', city: 'Key West', state: 'FL', name: 'Key West International Airport', categories: ['beach', 'adventure'] },
  { code: 'CHS', city: 'Charleston', state: 'SC', name: 'Charleston International Airport', categories: ['beach', 'historic'] },
  { code: 'SAV', city: 'Savannah/Hilton Head', state: 'GA', name: 'Savannah/Hilton Head International Airport', categories: ['beach', 'historic'] },
  { code: 'MYR', city: 'Myrtle Beach', state: 'SC', name: 'Myrtle Beach International Airport', categories: ['beach'] },
  { code: 'IAH', city: 'Houston', state: 'TX', name: 'George Bush Intercontinental Airport', categories: ['city'] },
  { code: 'MSY', city: 'New Orleans', state: 'LA', name: 'Louis Armstrong New Orleans International Airport', categories: ['city', 'historic', 'entertainment'] },
  { code: 'MSP', city: 'Minneapolis', state: 'MN', name: 'Minneapolis-St. Paul International Airport', categories: ['city'] },
  { code: 'BOS', city: 'Boston', state: 'MA', name: 'Boston Logan International Airport', categories: ['city', 'historic'] },
  { code: 'SAT', city: 'San Antonio', state: 'TX', name: 'San Antonio International Airport', categories: ['city', 'historic'] },
  { code: 'PDX', city: 'Portland', state: 'OR', name: 'Portland International Airport', categories: ['city', 'mountain', 'adventure'] },
  { code: 'SMF', city: 'Sacramento', state: 'CA', name: 'Sacramento International Airport', categories: ['city'] },
  { code: 'BUR', city: 'Burbank/Los Angeles', state: 'CA', name: 'Hollywood Burbank Airport', categories: ['city', 'entertainment'] },
  { code: 'LAX', city: 'Los Angeles', state: 'CA', name: 'Los Angeles International Airport', categories: ['city', 'beach', 'entertainment'] },
  { code: 'SAN', city: 'San Diego', state: 'CA', name: 'San Diego International Airport', categories: ['beach', 'city'] },
  { code: 'MCI', city: 'Kansas City', state: 'MO', name: 'Kansas City International Airport', categories: ['city'] },
  { code: 'MKE', city: 'Milwaukee', state: 'WI', name: 'Milwaukee Mitchell International Airport', categories: ['city'] },
  { code: 'OMA', city: 'Omaha', state: 'NE', name: 'Eppley Airfield', categories: ['city'] },
  { code: 'ORD', city: 'Chicago', state: 'IL', name: "O'Hare International Airport", categories: ['city', 'historic'] },
  { code: 'DCA', city: 'Washington', state: 'DC', name: 'Ronald Reagan Washington National Airport', categories: ['city', 'historic'] },
  { code: 'SFO', city: 'San Francisco', state: 'CA', name: 'San Francisco International Airport', categories: ['city', 'historic'] },
  { code: 'SEA', city: 'Seattle', state: 'WA', name: 'Seattle-Tacoma International Airport', categories: ['city', 'mountain', 'adventure'] },
  { code: 'RSW', city: 'Fort Myers', state: 'FL', name: 'Southwest Florida International Airport', categories: ['beach'] },
];
