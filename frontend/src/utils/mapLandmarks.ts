/**
 * mapLandmarks.ts
 *
 * Rich Landmark Callouts & Sector Navigation Dictionary for Dead by Daylight Maps.
 * Covers all 40+ canonical DBD maps and variants across all realms.
 *
 * Provides accurate 4-sector landmark callouts:
 * - 12 O'Clock / North Sector: Main Landmark / Exit Gates / North Spawn
 * - 3 O'Clock / East Sector: Loop Tile / Generator Cluster / East Gate / Feature
 * - 6 O'Clock / South Sector: Killer Shack / Basement / South Gates / Feature
 * - 9 O'Clock / West Sector: Jungle Gym / Pallet Gym / West Gate / Feature
 * - Center: Center Generator / Central Spine / Landmark Highlight
 *
 * Supports both Hens333 12-Clock Navigation and SamoelColt 4-Quadrant Isometric systems.
 */

export interface MapLandmarks {
  twelve_o_clock: string;
  three_o_clock: string;
  six_o_clock: string;
  nine_o_clock: string;
  center?: string;
  description?: string;
}

/**
 * Normalizes map and realm names for consistent dictionary lookups.
 * Handles casing, punctuation, diacritics, and whitespace.
 */
export function normalizeLandmarkKey(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0142/gi, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Realm-level fallback dictionary for intelligent landmark generation
 * when an exact map variant is not specified or recognized.
 */
export const REALM_LANDMARKS_DICTIONARY: Record<string, MapLandmarks> = {
  autohavenwreckers: {
    twelve_o_clock: "Main Auto Garage / North Exit Gate",
    three_o_clock: "Scrap Car Stacks / East Generator Yard",
    six_o_clock: "Killer Shack & Basement / South Gate",
    nine_o_clock: "Car Crusher Crane / West Pallet Gym",
    center: "Central Wreckage / Spine Generator",
    description: "Autohaven Wreckers industrial scrapyard with dense junk car loops and crane machinery.",
  },
  backwaterswamp: {
    twelve_o_clock: "Main Steamboat / Stilt Manor Upper Deck",
    three_o_clock: "East Boardwalk Pier / Reed Thicket",
    six_o_clock: "Killer Shack / South Marsh Gate",
    nine_o_clock: "West Willow Tree / Stilt Platforms",
    center: "Central Sunken Wreck / Reed Clearing Gen",
    description: "Backwater Swamp murky marshlands featuring stilted wooden piers and sunken riverboats.",
  },
  badham: {
    twelve_o_clock: "Badham Elementary / Boiler Room Basement",
    three_o_clock: "Two-Story Suburban House / House of Pain",
    six_o_clock: "Killer Shack / South Street Gate",
    nine_o_clock: "Playground Park / White Fence Loops",
    center: "Main Suburban Street / Abandoned Van",
    description: "Springwood suburban town with multi-floor residential homes and elementary school boiler basement.",
  },
  springwood: {
    twelve_o_clock: "Badham Elementary / Boiler Room Basement",
    three_o_clock: "Two-Story Suburban House / House of Pain",
    six_o_clock: "Killer Shack / South Street Gate",
    nine_o_clock: "Playground Park / White Fence Loops",
    center: "Main Suburban Street / Abandoned Van",
    description: "Springwood suburban town with multi-floor residential homes and elementary school boiler basement.",
  },
  coldwindfarm: {
    twelve_o_clock: "Farm Manor / Slaughterhouse Main Facility",
    three_o_clock: "Cornfield Thicket / Windmill Loop",
    six_o_clock: "Killer Shack / South Farm Gate",
    nine_o_clock: "Combine Harvester / Tractor Ramp Vault",
    center: "Central Silo / Open Corn Clearing",
    description: "Coldwind Farm agricultural expanse with tall corn stalk cover, harvesters, and cattle pens.",
  },
  crotusprennasylum: {
    twelve_o_clock: "Asylum Sanitarium / Bell Tower Chapel",
    three_o_clock: "Circus Caravan & Maurice / East Gazebo",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "Brick Wall Perimeter Gyms / Fence Maze",
    center: "Central Courtyard / Ambulance Loop",
    description: "Crotus Prenn Asylum psychiatric hospital grounds with brick corridors and carnival remnants.",
  },
  disturbedward: {
    twelve_o_clock: "Asylum Sanitarium / Upper Floor Drop",
    three_o_clock: "Circus Caravan / East Stone Gazebo",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "Brick Wall Perimeter Gyms / Fence Maze",
    center: "Central Courtyard / Ambulance Loop",
    description: "Crotus Prenn Asylum psychiatric hospital grounds with brick corridors and carnival remnants.",
  },
  decimatedborgo: {
    twelve_o_clock: "Burning Castle Keep / Dragon Throne",
    three_o_clock: "Dungeon Catacombs / Executioner Gallows",
    six_o_clock: "Killer Shack / South Moat Gate",
    nine_o_clock: "Ruined Medieval Cottages / Smoldering Timber",
    center: "Central Burning Scaffold / Portcullis Hub",
    description: "The Decimated Borgo medieval warzone with smoldering fortress ruins and underground dungeon passages.",
  },
  thedecimatedborgo: {
    twelve_o_clock: "Burning Castle Keep / Dragon Throne",
    three_o_clock: "Dungeon Catacombs / Executioner Gallows",
    six_o_clock: "Killer Shack / South Moat Gate",
    nine_o_clock: "Ruined Medieval Cottages / Smoldering Timber",
    center: "Central Burning Scaffold / Portcullis Hub",
    description: "The Decimated Borgo medieval warzone with smoldering fortress ruins and underground dungeon passages.",
  },
  dvarkadeepwood: {
    twelve_o_clock: "USCSS Nostromo Starship / Research Outpost",
    three_o_clock: "East Crystal Plateau / Shuttle Debris",
    six_o_clock: "Killer Shack / South Deepwood Gate",
    nine_o_clock: "West Spore Thicket / Alien Organisms",
    center: "Central Crash Core / Spire Generator",
    description: "Dvarka Deepwood lush alien planet featuring crashed interstellar vessels and crystalline flora.",
  },
  forsakenboneyard: {
    twelve_o_clock: "Eyrie Crow Tower / High Balcony & Library",
    three_o_clock: "Desert Crypts / Stone Sarcophagi Loops",
    six_o_clock: "Killer Shack / South Sand Gate",
    nine_o_clock: "Excavation Pit / Scaffold Tents",
    center: "Tower Plaza / Raven Monument Generator",
    description: "Forsaken Boneyard arid desert with a towering monolith spire, raven nests, and ancient tombs.",
  },
  gideonmeatplant: {
    twelve_o_clock: "Upper Bathrooms / Meat Grinders & Sliding Door",
    three_o_clock: "East Meat Freezers / Frozen Pig Carcasses",
    six_o_clock: "Blast Exit Doors / Packaging Ward",
    nine_o_clock: "West Operating Room / Metal Chute Drop",
    center: "Central 2-Story Hole / Metal Catwalk Stairs",
    description: "Gideon Meat Plant indoor industrial facility with two vertical levels, metal chutes, and heavy blast doors.",
  },
  graveofglennvale: {
    twelve_o_clock: "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
    three_o_clock: "East Gallows / Hanging Tree & Cart",
    six_o_clock: "Killer Shack / South Canyon Gate",
    nine_o_clock: "West Windmill / Water Tower Basin",
    center: "Frontier Main Street / Sheriff Carriage",
    description: "Grave of Glenvale frontier ghost town with breakable saloon walls and a central gallows square.",
  },
  graveofglenvale: {
    twelve_o_clock: "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
    three_o_clock: "East Gallows / Hanging Tree & Cart",
    six_o_clock: "Killer Shack / South Canyon Gate",
    nine_o_clock: "West Windmill / Water Tower Basin",
    center: "Frontier Main Street / Sheriff Carriage",
    description: "Grave of Glenvale frontier ghost town with breakable saloon walls and a central gallows square.",
  },
  haddonfield: {
    twelve_o_clock: "Michael Myers House / Attic Balcony & Stash",
    three_o_clock: "East Strode Residence / House of Pain",
    six_o_clock: "Killer Shack / South Suburb Gate",
    nine_o_clock: "West Suburban Residence / Garage Vault",
    center: "Lampkin Lane Main Street / Police Cruisers",
    description: "Haddonfield classic suburban street with residential porches, hedge vaults, and the iconic Myers house.",
  },
  hawkinsnationallaboratory: {
    twelve_o_clock: "Upside Down Rift Lab / Portal Chamber",
    three_o_clock: "East Isolation Tanks / Glass Chambers",
    six_o_clock: "Main Blast Doors / Decontamination Exit",
    nine_o_clock: "West Catwalk Silos / Storage Vats",
    center: "Hawkins Central Atrium / 2nd Floor Catwalks",
    description: "Hawkins underground research complex with catwalk overviews, portal chambers, and isolation cells.",
  },
  lerysmemorialinstitute: {
    twelve_o_clock: "Electroshock Operating Stage / 2nd Floor Glass",
    three_o_clock: "East Office Wing / Medical Records",
    six_o_clock: "Ambulance Bay Exit / Double Doors",
    nine_o_clock: "West Shower Ward / Treatment Rooms",
    center: "Central Operating Theatre / Shock Device Gen",
    description: "Léry's Memorial Institute modular mental hospital with treatment rooms, window vaults, and central operating arena.",
  },
  macmillanestate: {
    twelve_o_clock: "Industrial Brick Factory / Smelting Mill",
    three_o_clock: "East Minecart Yard / Brick Wall Gym",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Pipe Stacks / Dense Forest Gym",
    center: "Central Rail Spine / Industrial Scrap Pile",
    description: "The MacMillan Estate dark industrial forest featuring heavy ironworks, coal mines, and lumber yards.",
  },
  themacmillanestate: {
    twelve_o_clock: "Industrial Brick Factory / Smelting Mill",
    three_o_clock: "East Minecart Yard / Brick Wall Gym",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Pipe Stacks / Dense Forest Gym",
    center: "Central Rail Spine / Industrial Scrap Pile",
    description: "The MacMillan Estate dark industrial forest featuring heavy ironworks, coal mines, and lumber yards.",
  },
  ormond: {
    twelve_o_clock: "Ormond Ski Resort Chalet / Upper Balcony Bar",
    three_o_clock: "East Heavy Bulldozer / Snowplow Ramp",
    six_o_clock: "Killer Shack / South Mountain Gate",
    nine_o_clock: "West Snowmobile Stalls / Pine Forest",
    center: "Resort Front Porch / Snowy Bonfire Pit",
    description: "Mount Ormond snow-covered resort featuring an expansive wooden lodge, heavy excavation equipment, and frozen pine trails.",
  },
  raccooncity: {
    twelve_o_clock: "RPD Main Lobby / Goddess Statue & Front Steps",
    three_o_clock: "Rooftop Helipad / Burning Helicopter & Fire Escape",
    six_o_clock: "Front Courtyard Gate / Police Cruisers",
    nine_o_clock: "West 3-Story Library / Movable Bookshelves",
    center: "Main Hall Atrium / 2nd Floor Walkway Hub",
    description: "Raccoon City Police Department multi-story precinct featuring the iconic grand hall, library, and rooftop helipad.",
  },
  redforest: {
    twelve_o_clock: "Huntress Cottage / Ancient Stone Temple",
    three_o_clock: "East Stone Monoliths / Ancient Ruins",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Tall Pine Glade / Mossy Boulders",
    center: "Central Shrine / Ancient Glade Generator",
    description: "Red Forest misty woodland containing massive stone monoliths, babushka huts, and subterranean cleansing temples.",
  },
  silenthill: {
    twelve_o_clock: "North Classrooms / Reception & Infirmary",
    three_o_clock: "East Stairwell / Chemistry Lab & Lockers",
    six_o_clock: "South Classrooms / Library & Music Room",
    nine_o_clock: "West Stairwell / Restrooms & Flayed Corpse",
    center: "Central Courtyard / Clock Tower & Sirens",
    description: "Midwich Elementary School nightmarish two-story schoolhouse with an open courtyard and haunting clock tower.",
  },
  sleeplessdistrict: {
    twelve_o_clock: "Neon Concert Stage / VIP Lounge & Backstage",
    three_o_clock: "East Sound Stage / Recording Booths",
    six_o_clock: "Killer Shack / Alley Exit Gate",
    nine_o_clock: "West Neon Alleyway / Dumpsters & Neon Signs",
    center: "Nightclub Dancefloor / Neon DJ Booth Gen",
    description: "Sleepless District urban nightlife alleyways drenched in neon lighting and concert stages.",
  },
  witheredisle: {
    twelve_o_clock: "Corrupted Colonial Manor / Cinema / Pizzeria Stage",
    three_o_clock: "East Greenhouse / Arcade Lobby / Chapel Garden",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Gazebo / Parking Lot / Prize Corner",
    center: "Town Plaza / Corrupted Roots & Fountain Gen",
    description: "Withered Isle distorted alternate dimensions spanning suburban squares, decayed manors, and haunted establishments.",
  },
  yamaokaestate: {
    twelve_o_clock: "Yamaoka Family Residence / Ancestral Shrine",
    three_o_clock: "East Bamboo Grove / Stone Torii Gates",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Garden Pagoda / Stone Lanterns",
    center: "Residence Front Courtyard / Ancestral Tree Gen",
    description: "Yamaoka Estate traditional Japanese heritage sanctuary surrounded by bamboo forests, stone lanterns, and shrines.",
  },
};

/**
 * Complete DBD Map Landmark Dictionary covering all 40+ canonical maps & variants.
 */
export const MAP_LANDMARKS_DICTIONARY: Record<string, MapLandmarks> = {
  // ─── Autohaven Wreckers ─────────────────────────────────────────────────────
  azarovsrestingplace: {
    twelve_o_clock: "Azarov's Office & Garage / North Exit Gate",
    three_o_clock: "East Tree Cluster / Long Wall Pallet Tile",
    six_o_clock: "Killer Shack & Basement / South Exit Gate",
    nine_o_clock: "Car Crusher Crane / Scrap Pallet Gym",
    center: "Center Chokepoint / Spine Generator",
    description: "Azarov's Resting Place dumbbell map divided by a narrow middle chokepoint connecting two wide zones.",
  },
  bloodlodge: {
    twelve_o_clock: "Blood Lodge Main Building / North Spawn",
    three_o_clock: "East Jungle Gyms / High Pallet Density Area",
    six_o_clock: "Killer Shack & Basement / South Gate",
    nine_o_clock: "Car Crusher / Scrap Metal Piles",
    center: "Central Crane / Tree Loop Generator",
    description: "Blood Lodge expansive junkyard renowned for high pallet loop density and the central crane engine.",
  },
  gasheaven: {
    twelve_o_clock: "Gas Station & Auto Repair Shop (Gen Door Vault)",
    three_o_clock: "East Car Wall Loops / Scrap Yard",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West Jungle Gym & Long Wall Tiles",
    center: "Central Scrap Heap & Flatbed Truck",
    description: "Gas Heaven feature map with an interactive service garage door opened by completing the main building generator.",
  },
  wreckersyard: {
    twelve_o_clock: "North Crane / Scrap Car Stacks",
    three_o_clock: "East Pallet Gym / Tree Loop",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West L-T Wall / Four-Wall Gym",
    center: "Central Car Compactor / Open Spine Gen",
    description: "Wreckers' Yard open scrapyard without a dedicated main building, centered on a massive car compactor.",
  },
  wretchedshop: {
    twelve_o_clock: "Wretched Shop Garage / Vault Window",
    three_o_clock: "East Car Wall Maze / Generator Cluster",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West Scrap Crane / L-T Walls",
    center: "Central Tree / High Pallet Corridor",
    description: "Wretched Shop automotive maintenance garage with strong window vaults and surrounding car barricades.",
  },

  // ─── Backwater Swamp ────────────────────────────────────────────────────────
  thepalerose: {
    twelve_o_clock: "The Pale Rose Steamboat / Upper Deck & Wheelhouse",
    three_o_clock: "East Boardwalk Pier / Reed Thicket",
    six_o_clock: "Killer Shack / South Swamp Gate",
    nine_o_clock: "West Willow Tree / Stilt Platform Loop",
    center: "Sunken Wreck / Marsh Generator",
    description: "The Pale Rose multi-deck river steamboat stranded amidst foggy reeds and stilt piers.",
  },
  grimpantry: {
    twelve_o_clock: "Grim Pantry Stilt House / Drop Vault & Pantry Basement",
    three_o_clock: "East Pier / High Water Boardwalk Shacks",
    six_o_clock: "Killer Shack / South Swamp Gate",
    nine_o_clock: "West Wooden Maze / Reed Loops",
    center: "Central Sunken Boat / Low Marsh Clearing",
    description: "Grim Pantry elevated stilt lodge with basement vaults and extensive wooden boardwalks.",
  },

  // ─── Badham Preschool / Springwood ──────────────────────────────────────────
  preschooli: {
    twelve_o_clock: "Badham Elementary / Boiler Room Basement",
    three_o_clock: "East 2-Story House / House of Pain",
    six_o_clock: "Killer Shack / South Suburb Gate",
    nine_o_clock: "West Street Cars / White Fence Loop",
    center: "Preschool Front Courtyard / Parked Cars",
    description: "Badham Preschool I layout with boiler basement under the school and suburban houses on the perimeter.",
  },
  badhampreschooli: {
    twelve_o_clock: "Badham Elementary / Boiler Room Basement",
    three_o_clock: "East 2-Story House / House of Pain",
    six_o_clock: "Killer Shack / South Suburb Gate",
    nine_o_clock: "West Street Cars / White Fence Loop",
    center: "Preschool Front Courtyard / Parked Cars",
    description: "Badham Preschool I layout with boiler basement under the school and suburban houses on the perimeter.",
  },
  preschoolii: {
    twelve_o_clock: "Preschool Main Entrance / Schoolyard",
    three_o_clock: "East House of Pain / Backyard Fences",
    six_o_clock: "Killer Shack / South Fence Gate",
    nine_o_clock: "West 2-Story Residence / Porch Vault",
    center: "Central Street / Abandoned Van Generator",
    description: "Badham Preschool II variant repositioning residential houses relative to the main schoolhouse.",
  },
  badhampreschoolii: {
    twelve_o_clock: "Preschool Main Entrance / Schoolyard",
    three_o_clock: "East House of Pain / Backyard Fences",
    six_o_clock: "Killer Shack / South Fence Gate",
    nine_o_clock: "West 2-Story Residence / Porch Vault",
    center: "Central Street / Abandoned Van Generator",
    description: "Badham Preschool II variant repositioning residential houses relative to the main schoolhouse.",
  },
  preschooliii: {
    twelve_o_clock: "Preschool Building / Boiler Basement",
    three_o_clock: "East Suburb Cul-de-sac / Corner House",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Playpark / Jungle Gym",
    center: "Central Crossroad / Generator",
    description: "Badham Preschool III featuring a corner cul-de-sac and playground jungle gyms.",
  },
  badhampreschooliii: {
    twelve_o_clock: "Preschool Building / Boiler Basement",
    three_o_clock: "East Suburb Cul-de-sac / Corner House",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Playpark / Jungle Gym",
    center: "Central Crossroad / Generator",
    description: "Badham Preschool III featuring a corner cul-de-sac and playground jungle gyms.",
  },
  preschooliiiv: {
    twelve_o_clock: "Preschool Main Structure / Boiler Room",
    three_o_clock: "East 2-Story House / Corner Loop",
    six_o_clock: "Killer Shack / South Street Gate",
    nine_o_clock: "West Playground / Fence Maze",
    center: "Suburban Street / Service Truck",
    description: "Badham Preschool IV variant featuring balanced suburban streets and fence maze vaults.",
  },
  preschooliv: {
    twelve_o_clock: "Preschool Main Structure / Boiler Room",
    three_o_clock: "East 2-Story House / Corner Loop",
    six_o_clock: "Killer Shack / South Street Gate",
    nine_o_clock: "West Playground / Fence Maze",
    center: "Suburban Street / Service Truck",
    description: "Badham Preschool IV variant featuring balanced suburban streets and fence maze vaults.",
  },
  badhampreschooliv: {
    twelve_o_clock: "Preschool Main Structure / Boiler Room",
    three_o_clock: "East 2-Story House / Corner Loop",
    six_o_clock: "Killer Shack / South Street Gate",
    nine_o_clock: "West Playground / Fence Maze",
    center: "Suburban Street / Service Truck",
    description: "Badham Preschool IV variant featuring balanced suburban streets and fence maze vaults.",
  },
  preschoolv: {
    twelve_o_clock: "Preschool Facility / Basement Lab",
    three_o_clock: "East House / Garage Vault",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West Residential Driveway / Cars",
    center: "School Playground / Central Fence Gen",
    description: "Badham Preschool V variant offering wide open street sightlines and strong garage vaults.",
  },
  badhampreschoolv: {
    twelve_o_clock: "Preschool Facility / Basement Lab",
    three_o_clock: "East House / Garage Vault",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West Residential Driveway / Cars",
    center: "School Playground / Central Fence Gen",
    description: "Badham Preschool V variant offering wide open street sightlines and strong garage vaults.",
  },

  // ─── Coldwind Farm ──────────────────────────────────────────────────────────
  fracturedcowshed: {
    twelve_o_clock: "Fractured Cowshed / God Window Vault & Pen",
    three_o_clock: "East Cornfield Maze / Windmill",
    six_o_clock: "Killer Shack / South Farm Gate",
    nine_o_clock: "Harvester Tractor / Combine Ramp",
    center: "Cattle Silo / Central Hay Bale Cluster",
    description: "Fractured Cowshed famous for the strong barn window vault and surrounding corn maze tiles.",
  },
  rancidabattoir: {
    twelve_o_clock: "Meat Slaughterhouse / Pig Hooks & Chute Vault",
    three_o_clock: "East Combine Harvester / Hay Cart",
    six_o_clock: "Killer Shack / South Farm Gate",
    nine_o_clock: "West Corn Maze / Tall Stalks",
    center: "Central Silo / Windmill Generator",
    description: "Rancid Abattoir meat slaughtering facility filled with carcass hooks, freezer chutes, and silos.",
  },
  rancidabbatoir: {
    twelve_o_clock: "Meat Slaughterhouse / Pig Hooks & Chute Vault",
    three_o_clock: "East Combine Harvester / Hay Cart",
    six_o_clock: "Killer Shack / South Farm Gate",
    nine_o_clock: "West Corn Maze / Tall Stalks",
    center: "Central Silo / Windmill Generator",
    description: "Rancid Abattoir meat slaughtering facility filled with carcass hooks, freezer chutes, and silos.",
  },
  rottenfields: {
    twelve_o_clock: "North Combine Harvester / Ramp Loop",
    three_o_clock: "East Cornfield / Four-Wall Pallet Gym",
    six_o_clock: "Killer Shack / South Farm Gate",
    nine_o_clock: "West Windmill / Hay Bales",
    center: "Central Cornfield Gen / Scarecrow Tree",
    description: "Rotten Fields completely open cornfield map without a large building, heavily reliant on corn stealth and harvester loops.",
  },
  thompsonhouse: {
    twelve_o_clock: "Thompson Manor / 2-Story Wrap Porch & Balcony",
    three_o_clock: "East Cornfield / Harvester Loop",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Windmill / Cattle Pen",
    center: "Porch Yard / Central Haystack Gen",
    description: "The Thompson House two-story southern estate house overlooking expansive cornfield rows.",
  },
  thethompsonhouse: {
    twelve_o_clock: "Thompson Manor / 2-Story Wrap Porch & Balcony",
    three_o_clock: "East Cornfield / Harvester Loop",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Windmill / Cattle Pen",
    center: "Porch Yard / Central Haystack Gen",
    description: "The Thompson House two-story southern estate house overlooking expansive cornfield rows.",
  },
  tormentcreek: {
    twelve_o_clock: "Torment Creek Silo / Ruined Barn Frame",
    three_o_clock: "East Corn Maze / Tractor Loop",
    six_o_clock: "Killer Shack / South Exit Gate",
    nine_o_clock: "West Harvester / Hay Wagon",
    center: "Fallen Silo / Center Farm Clearing Gen",
    description: "Torment Creek collapsed agricultural barn with fallen silo debris forming strong looping vaults.",
  },

  // ─── Crotus Prenn Asylum ────────────────────────────────────────────────────
  disturbedward: {
    twelve_o_clock: "Asylum Sanitarium / 2nd Floor Drop & Hall",
    three_o_clock: "East Gazebo / Stone Fountain Loop",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Perimeter Gym / Brick Wall",
    center: "Asylum Front Courtyard / Ambulance Loop",
    description: "Disturbed Ward massive asylum sanitarium structure surrounded by stone gazebos and brick perimeter gyms.",
  },
  fathercampbellschapel: {
    twelve_o_clock: "Father Campbell's Chapel / Bell Tower & Pews",
    three_o_clock: "East Circus Caravan / Maurice the Horse",
    six_o_clock: "Killer Shack / South Asylum Gate",
    nine_o_clock: "West Carnival Gazebo / Ticket Booth",
    center: "Chapel Courtyard / Hearse Carriage Gen",
    description: "Father Campbell's Chapel gothic stone sanctuary with the Clown's carnival caravan parked nearby.",
  },
  fathercambellschapel: {
    twelve_o_clock: "Father Campbell's Chapel / Bell Tower & Pews",
    three_o_clock: "East Circus Caravan / Maurice the Horse",
    six_o_clock: "Killer Shack / South Asylum Gate",
    nine_o_clock: "West Carnival Gazebo / Ticket Booth",
    center: "Chapel Courtyard / Hearse Carriage Gen",
    description: "Father Campbell's Chapel gothic stone sanctuary with the Clown's carnival caravan parked nearby.",
  },

  // ─── Decimated Borgo ────────────────────────────────────────────────────────
  shatteredsquare: {
    twelve_o_clock: "Ruined Keep / Burning Manor Hearth",
    three_o_clock: "East Gallows / Executioner Cart",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Smoldering Cottages / Hay Cart",
    center: "Central Burning Rubble / Scaffold Gen",
    description: "The Shattered Square razed medieval settlement with smoldering ruins, gallows, and manor keep.",
  },
  theshatteredsquare: {
    twelve_o_clock: "Ruined Keep / Burning Manor Hearth",
    three_o_clock: "East Gallows / Executioner Cart",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Smoldering Cottages / Hay Cart",
    center: "Central Burning Rubble / Scaffold Gen",
    description: "The Shattered Square razed medieval settlement with smoldering ruins, gallows, and manor keep.",
  },
  forgottenruins: {
    twelve_o_clock: "Fortress Keep / Dragon Throne Chamber",
    three_o_clock: "East Dungeon Catacombs / Vault Chutes",
    six_o_clock: "Killer Shack / Outer Moat Gate",
    nine_o_clock: "West Tower Ruins / Stone Corridors",
    center: "Subterranean Altar / Portcullis Hub Gen",
    description: "Forgotten Ruins ancient subterranean fortress featuring the Dragon's lair and multi-level dungeon catacombs.",
  },
  thedecimatedborgomap3: {
    twelve_o_clock: "Ruined Keep / Great Hall",
    three_o_clock: "East Gallows / Medieval Cottages",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Siege Engines / Wooden Barricades",
    center: "Central Burning Scaffold Gen",
    description: "The Decimated Borgo fortress perimeter with burning timber barricades and siege engines.",
  },

  // ─── Dvarka Deepwood ────────────────────────────────────────────────────────
  tobalanding: {
    twelve_o_clock: "Alien Research Station / Glass Lookout & Ramp",
    three_o_clock: "East Crystal Flora / Plateau Rocks",
    six_o_clock: "Killer Shack / South Alien Forest Gate",
    nine_o_clock: "West Giant Fungus / Spore Trees",
    center: "Central Pod / Alien Spire Generator",
    description: "Toba Landing extraterrestrial research base on an alien planet with crystalline rock formations and spore trees.",
  },
  nostromowreckage: {
    twelve_o_clock: "USCSS Nostromo Hull / Cryo Chamber & Bridge",
    three_o_clock: "East Escape Shuttle / Exhaust Plume",
    six_o_clock: "Killer Shack / South Plateau Gate",
    nine_o_clock: "West Mineral Spire / Alien Outcrop",
    center: "Starship Central Debris / Engine Core Gen",
    description: "Nostromo Wreckage crashed Weyland-Yutani starship hull with interactive cryo-chamber coolants.",
  },
  dvarkadeepwoodmap3: {
    twelve_o_clock: "Crashed Module / Command Deck",
    three_o_clock: "East Bioluminescent Grove / Crystals",
    six_o_clock: "Killer Shack / South Deepwood Gate",
    nine_o_clock: "West Spore Plateau / Rocky Formations",
    center: "Deepwood Clearing / Energy Conduit Gen",
    description: "Dvarka Deepwood alien ecosystem with bioluminescent flora and starship wreckage remnants.",
  },
  dvarkadeepwoodmap4: {
    twelve_o_clock: "Research Pod / Solar Arrays",
    three_o_clock: "East Alien Ridge / Plateau Gym",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Fungus Spire / Mineral Formations",
    center: "Central Crater / Xenomorph Debris",
    description: "Dvarka Deepwood alien terrain featuring impact craters and strange planetary flora.",
  },

  // ─── Forsaken Boneyard ──────────────────────────────────────────────────────
  eyrieofcrows: {
    twelve_o_clock: "Eyrie Crow Tower / High Balcony & Library",
    three_o_clock: "East Desert Crypts / Stone Sarcophagi",
    six_o_clock: "Killer Shack / South Sand Gate",
    nine_o_clock: "West Canvas Tents / Excavation Pit",
    center: "Tower Base / Raven Statues & Open Sand",
    description: "Eyrie of Crows majestic stone tower rising from Chilean desert sands with ink-stained murals and raven nests.",
  },
  deadsands: {
    twelve_o_clock: "Ruined Crypt Spire / Sand Citadel",
    three_o_clock: "East Sarcophagus Maze / Stone Walls",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Excavation Trench / Scaffolding",
    center: "Central Sunken Relic / Sand Dunes Gen",
    description: "Dead Sands desert expansion with excavated tomb relics, scaffolds, and sand dunes.",
  },

  // ─── Gideon Meat Plant ──────────────────────────────────────────────────────
  thegame: {
    twelve_o_clock: "Upper Bathrooms / Sliding Door Vats",
    three_o_clock: "East Freezer / Frozen Pig Carcasses",
    six_o_clock: "Blast Door Exit / Lower Packaging Room",
    nine_o_clock: "West Jigsaw Operating Room / Metal Chute",
    center: "Central 2-Story Hole / Metal Catwalk Stairs",
    description: "The Game Saw-themed meatpacking facility with two complete indoor floors and high pallet density.",
  },
  gideonmeatplantmap2: {
    twelve_o_clock: "Upper Level Slicers / Tile Bathrooms",
    three_o_clock: "East Meat Hanging Freezers",
    six_o_clock: "Blast Exit Gate / Ground Packaging",
    nine_o_clock: "West Operating Room / Metal Chutes",
    center: "Central Catwalk Staircase / Saw Trap Room",
    description: "Gideon Meat Plant layout featuring industrial slicing machines and heavy vertical navigation.",
  },

  // ─── Grave of Glennvale ─────────────────────────────────────────────────────
  deaddawgsaloon: {
    twelve_o_clock: "Dead Dawg Saloon / 2nd Floor Balcony & Bar",
    three_o_clock: "East Gallows / Hanging Tree & Cart",
    six_o_clock: "Killer Shack / South Canyon Gate",
    nine_o_clock: "West Windmill / Water Tower Basin",
    center: "Main Street / Sheriff Carriage & Barbed Fence",
    description: "Dead Dawg Saloon Wild West ghost town featuring breakable wooden doors, a central gallows, and saloon balcony.",
  },

  // ─── Haddonfield ────────────────────────────────────────────────────────────
  lampkinlane: {
    twelve_o_clock: "Myers House / Roof Balcony & Secret Stash",
    three_o_clock: "East Strode Residence / House of Pain",
    six_o_clock: "Killer Shack / South Suburb Gate",
    nine_o_clock: "West 2-Story House / Garage Roof",
    center: "Lampkin Lane Main Street / Police Cruisers",
    description: "Lampkin Lane Halloween suburban street with the Myers house, porch loops, and narrow alleys.",
  },

  // ─── Hawkins National Laboratory ────────────────────────────────────────────
  theundergroundcomplex: {
    twelve_o_clock: "Upside Down Rift Lab / Portal Chamber",
    three_o_clock: "East Isolation Tanks / Glass Chambers",
    six_o_clock: "Main Blast Doors / Decontamination Exit",
    nine_o_clock: "West Catwalk Silos / Storage Vats",
    center: "Hawkins Central Atrium / 2nd Floor Catwalks",
    description: "The Underground Complex Stranger Things laboratory with the interdimensional portal and narrow metal halls.",
  },

  // ─── Léry's Memorial Institute ──────────────────────────────────────────────
  treatmenttheatre: {
    twelve_o_clock: "Electroshock Operating Stage / 2nd Floor Glass",
    three_o_clock: "East Office Wing / Reception & Medical Files",
    six_o_clock: "Ambulance Bay Exit / Double Glass Doors",
    nine_o_clock: "West Hydrotherapy / Patient Shower Ward",
    center: "Central Operating Theatre / Shock Device Gen",
    description: "Treatment Theatre indoor hospital labyrinth centered around the elevated electroshock observation dome.",
  },

  // ─── MacMillan Estate ───────────────────────────────────────────────────────
  coaltower: {
    twelve_o_clock: "Coal Tower 2-Story Brick Factory / Drop Vault",
    three_o_clock: "East Minecart Tracks / Water Tower",
    six_o_clock: "Killer Shack / South Mine Gate",
    nine_o_clock: "West Industrial L-T Walls / Brick Gyms",
    center: "Central Minecart Rail / Forest Clearing",
    description: "Coal Tower two-story industrial brick manufacturing tower with high-drop window vaults.",
  },
  coaltowerii: {
    twelve_o_clock: "Coal Tower Factory / Upper Window Drop",
    three_o_clock: "East Water Tower / Minecart Loops",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Forest Gyms / Industrial Walls",
    center: "Central Rail Tracks / Generator",
    description: "Coal Tower II variant repositioning the industrial factory and outer tile layouts.",
  },
  groaningstorehouse: {
    twelve_o_clock: "Groaning Storehouse / Timber Factory & God Window",
    three_o_clock: "East Log Piles / Cut Wood Pallets",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Brick Four-Wall / Industrial Gym",
    center: "Central Lumber Yard / Crane Clearing Gen",
    description: "Groaning Storehouse expansive timber processing storehouse with strong window vaults and log stack loops.",
  },
  groaningstorehouseii: {
    twelve_o_clock: "Lumber Storehouse / Timber Factory Vault",
    three_o_clock: "East Cut Log Stacks / Pallet Loops",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Brick Gyms / Four-Walls",
    center: "Central Lumber Yard / Log Crane",
    description: "Groaning Storehouse II variant with adjusted log pile spacing and perimeter tile distribution.",
  },
  ironworksofmisery: {
    twelve_o_clock: "Ironworks Smelting Kiln / Blast Furnace Pipe Vault",
    three_o_clock: "East Industrial Pipes / Brick Wall Maze",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Jungle Gyms / Metal Dumpster Loop",
    center: "Kiln Front Yard / Iron Scrap Pile Gen",
    description: "Ironworks of Misery massive smelting kiln factory with iconic pipe vaults and iron ore scrap piles.",
  },
  ironworksofmiseryii: {
    twelve_o_clock: "Ironworks Kiln / Blast Furnace Facility",
    three_o_clock: "East Industrial Brick Maze / Pipes",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Four-Walls / Scrap Loops",
    center: "Kiln Front Yard / Center Generator",
    description: "Ironworks of Misery II variant with reworked factory exterior loops and scrap yards.",
  },
  shelterwoods: {
    twelve_o_clock: "Massive Ancient Oak Tree / Merchant Camp",
    three_o_clock: "East Moonstone Rock Outcrops / Gyms",
    six_o_clock: "Killer Shack / South Woods Gate",
    nine_o_clock: "West Dense Tree Stumps / Pallet Loops",
    center: "Central Clearing / Fallen Tree Trunk Gen",
    description: "Shelter Woods dense forest centered around the colossal ancient oak tree and drone encampment.",
  },
  shelterwoodsii: {
    twelve_o_clock: "Colossal Oak Tree / Radar Encampment",
    three_o_clock: "East Boulder Clusters / Forest Gyms",
    six_o_clock: "Killer Shack / South Woods Gate",
    nine_o_clock: "West Tree Stumps / High Pallet Area",
    center: "Central Oak Base / Clearing Generator",
    description: "Shelter Woods II featuring upgraded radar camp structures and boulder loops around the central oak.",
  },
  suffocationpit: {
    twelve_o_clock: "Mine Shaft Entrance / Stone Crusher Ramps",
    three_o_clock: "East Heavy Brick Gyms / High Walls",
    six_o_clock: "Killer Shack / South Mine Gate",
    nine_o_clock: "West Minecart Piles / Rock Clusters",
    center: "Suffocation Pit Chokepoint / Rail Ramp Gen",
    description: "Suffocation Pit dumbbell layout with the mine shaft ramp dividing the map into two distinct looping areas.",
  },
  suffocationpitii: {
    twelve_o_clock: "Mine Shaft Ramp / Crusher Platform",
    three_o_clock: "East Brick Gyms / Four-Walls",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Minecarts / Rock Formations",
    center: "Suffocation Chokepoint / Center Rail Gen",
    description: "Suffocation Pit II variant with widened central chokepoint and balanced pallet distribution.",
  },

  // ─── Ormond ─────────────────────────────────────────────────────────────────
  mountormondresort: {
    twelve_o_clock: "Ormond Ski Resort Chalet / Upper Balcony Bar",
    three_o_clock: "East Heavy Bulldozer / Snowplow Ramp",
    six_o_clock: "Killer Shack / South Mountain Gate",
    nine_o_clock: "West Snowmobile Stalls / Pine Forest",
    center: "Resort Front Porch / Snowy Bonfire Pit Gen",
    description: "Mount Ormond Resort ski lodge chalet with two interior levels, outdoor balconies, and snowplow ramps.",
  },
  mountormondresortv1: {
    twelve_o_clock: "Ormond Ski Resort Chalet / Upper Balcony Bar",
    three_o_clock: "East Heavy Bulldozer / Snowplow Ramp",
    six_o_clock: "Killer Shack / South Mountain Gate",
    nine_o_clock: "West Snowmobile Stalls / Pine Forest",
    center: "Resort Front Porch / Snowy Bonfire Pit Gen",
    description: "Mount Ormond Resort ski lodge chalet with two interior levels, outdoor balconies, and snowplow ramps.",
  },
  mountormondresortii: {
    twelve_o_clock: "Ski Chalet / Main Dining & Upper Deck",
    three_o_clock: "East Snow Excavator / Bulldozer",
    six_o_clock: "Killer Shack / South Slope Gate",
    nine_o_clock: "West Pine Glade / Snowmobile Barn",
    center: "Resort Terrace / Central Bonfire Gen",
    description: "Mount Ormond Resort II variant with updated snowdrift obstacles and exterior timber loops.",
  },
  mountormondresortv2: {
    twelve_o_clock: "Ski Chalet / Main Dining & Upper Deck",
    three_o_clock: "East Snow Excavator / Bulldozer",
    six_o_clock: "Killer Shack / South Slope Gate",
    nine_o_clock: "West Pine Glade / Snowmobile Barn",
    center: "Resort Terrace / Central Bonfire Gen",
    description: "Mount Ormond Resort II variant with updated snowdrift obstacles and exterior timber loops.",
  },
  mountormondresortiii: {
    twelve_o_clock: "Ski Lodge / Hearth & 2nd Floor Bar",
    three_o_clock: "East Snow Groomer / Excavation Yard",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Snowmobile Trail / Pine Loops",
    center: "Front Porch / Bonfire Generator",
    description: "Mount Ormond Resort III variant featuring tighter exterior loops and balanced chalet entrances.",
  },
  ormondlakemine: {
    twelve_o_clock: "Lake Mine Headframe / Elevator Shaft & Crane",
    three_o_clock: "East Mining Excavator / Rock Wall",
    six_o_clock: "Killer Shack / South Glacier Gate",
    nine_o_clock: "West Minecart Siding / Heavy Timber",
    center: "Mine Quarry Pit / Conveyor Belt Gen",
    description: "Ormond Lake Mine industrial mining headframe located on a frozen mountainside with rock quarry cuts.",
  },

  // ─── Raccoon City ───────────────────────────────────────────────────────────
  policestationeastwing: {
    twelve_o_clock: "RPD Main Lobby / Goddess Statue & Front Steps",
    three_o_clock: "Rooftop Helipad / Burning Helicopter & Fire Escape",
    six_o_clock: "East Office Wing / Chief Irons Taxidermy Office",
    nine_o_clock: "East Waiting Room / Fire Exit Corridor",
    center: "Main Hall Atrium / 2nd Floor Walkway Hub",
    description: "Raccoon City Police Station East Wing focusing on the rooftop helipad, art room, and east office halls.",
  },
  policestationwestwing: {
    twelve_o_clock: "RPD Main Lobby / Goddess Statue & Front Steps",
    three_o_clock: "S.T.A.R.S. Office / 2nd Floor Corridor",
    six_o_clock: "West Office / Records Room & Dark Room",
    nine_o_clock: "West 3-Story Library / Movable Bookshelves",
    center: "Main Hall Atrium / West Yard Gates",
    description: "Raccoon City Police Station West Wing focusing on the multi-story library, S.T.A.R.S. office, and dark room.",
  },
  raccooncitypolicestation: {
    twelve_o_clock: "RPD Grand Hall / Goddess Statue & Front Desk",
    three_o_clock: "East Wing / Rooftop Helipad & Fire Escape",
    six_o_clock: "Front Courtyard / Police Cruiser Barricades",
    nine_o_clock: "West Wing / 3-Story Library & S.T.A.R.S. Office",
    center: "Main Reception Desk / Staircase Hub",
    description: "Raccoon City Police Station iconic multi-story indoor precinct with extensive Resident Evil lore references.",
  },
  raccooncitymap2: {
    twelve_o_clock: "RPD Grand Hall / Goddess Statue",
    three_o_clock: "East Helipad & Chief's Office",
    six_o_clock: "Front Yard Entrance Gates",
    nine_o_clock: "West Library & Operations Room",
    center: "Main Atrium / Grand Staircase Hub",
    description: "Raccoon City Police Station variant layout with adjusted door access and window corridors.",
  },

  // ─── Red Forest ─────────────────────────────────────────────────────────────
  mothersdwelling: {
    twelve_o_clock: "Huntress Cottage / 2-Story Wooden Lodge & Porch",
    three_o_clock: "East Stone Monoliths / Ancient Ruins",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Tall Pine Glade / Mossy Boulders",
    center: "Mother's Glade / Fallen Birch Trunk Gen",
    description: "Mother's Dwelling sprawling Russian forest with the Huntress's two-story wooden cabin and stone monoliths.",
  },
  templeofpurgation: {
    twelve_o_clock: "Temple of Purgation / Underground Altar Basement",
    three_o_clock: "East Stone Columns / Ancient Wall Gyms",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Pine Thicket / Relic Obelisks",
    center: "Temple Entrance Steps / Pool of Purgation Gen",
    description: "Temple of Purgation ancient Babylonian stone temple with multi-floor underground cleansing altar chambers.",
  },
  thetempleofpurgation: {
    twelve_o_clock: "Temple of Purgation / Underground Altar Basement",
    three_o_clock: "East Stone Columns / Ancient Wall Gyms",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Pine Thicket / Relic Obelisks",
    center: "Temple Entrance Steps / Pool of Purgation Gen",
    description: "Temple of Purgation ancient Babylonian stone temple with multi-floor underground cleansing altar chambers.",
  },

  // ─── Silent Hill ────────────────────────────────────────────────────────────
  midwichelementaryschool: {
    twelve_o_clock: "North Classrooms / Reception & Infirmary",
    three_o_clock: "East Stairwell / Chemistry Lab & Lockers",
    six_o_clock: "South Classrooms / Library & Music Room",
    nine_o_clock: "West Stairwell / Restrooms & Flayed Corpse",
    center: "Central Courtyard / Clock Tower & Sirens",
    description: "Midwich Elementary School square two-story indoor layout centered around the iconic courtyard clock tower.",
  },
  silenthillmap2: {
    twelve_o_clock: "North Classrooms / Reception",
    three_o_clock: "East Chemistry Lab & Stairwell",
    six_o_clock: "South Library & Music Room",
    nine_o_clock: "West Restrooms & Locker Corridor",
    center: "Courtyard Clock Tower Generator",
    description: "Midwich Elementary School variant with alternate classroom doorways and stairwell access.",
  },

  // ─── Sleepless District ─────────────────────────────────────────────────────
  trickstersdelusion: {
    twelve_o_clock: "Neon Concert Stage / VIP Lounge & Backstage",
    three_o_clock: "East Sound Stage / Recording Booths",
    six_o_clock: "Killer Shack / Alley Exit Gate",
    nine_o_clock: "West Neon Alleyway / Dumpsters & Neon Signs",
    center: "Nightclub Dancefloor / Neon DJ Booth Gen",
    description: "Trickster's Delusion neon-lit K-pop entertainment district with sound stages, alleys, and VIP clubs.",
  },

  // ─── Withered Isle ──────────────────────────────────────────────────────────
  gardenofjoy: {
    twelve_o_clock: "Corrupted Colonial Manor / 2nd Floor Attic Drop",
    three_o_clock: "East Greenhouse / Overgrown Trellis",
    six_o_clock: "Killer Shack / South Forest Gate",
    nine_o_clock: "West Gazebo / Twisted Picnic Tables",
    center: "Front Lawn / Corrupted Roots & Fountain Gen",
    description: "Garden of Joy corrupted colonial mansion featuring high attic drops, a greenhouse, and gazebo loops.",
  },
  greenvillesquare: {
    twelve_o_clock: "Greenville Cinema / Theater Screen & Arcade Lobby",
    three_o_clock: "East Town Gazebo / Stone Statue Park",
    six_o_clock: "Killer Shack / South Road Gate",
    nine_o_clock: "West Parking Lot / Abandoned Sedan Loops",
    center: "Town Square Plaza / Central Fountain Gen",
    description: "Greenville Square 1980s commercial square featuring an indoor cinema theater, town statue, and arcade.",
  },
  freddyfazbearspizza: {
    twelve_o_clock: "Pizzeria Show Stage / Animatronic Band",
    three_o_clock: "Pirate Cove & Kitchen / Stage Curtains",
    six_o_clock: "Security Office / South Dining Exit",
    nine_o_clock: "Arcade Hall & Prize Corner / Ball Pit",
    center: "Main Dining Room / Party Tables Generator",
    description: "Freddy Fazbear's Pizza haunted family pizzeria featuring the main stage, pirate cove, and security office.",
  },
  fallenrefuge: {
    twelve_o_clock: "Crumbled Chapel / Sanctuary Spire",
    three_o_clock: "East Overgrown Garden / Stone Arches",
    six_o_clock: "Killer Shack / South Refuge Gate",
    nine_o_clock: "West Refugee Camp / Tents & Crates",
    center: "Chapel Courtyard / Broken Monument Gen",
    description: "Fallen Refuge dilapidated sanctuary with crumbled stone archways and refugee campsites.",
  },

  // ─── Yamaoka Estate ─────────────────────────────────────────────────────────
  familyresidence: {
    twelve_o_clock: "Yamaoka Family House / Shoji Screen Porch & Roof",
    three_o_clock: "East Bamboo Thicket / Stone Torii Gate",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Garden Pagoda / Stone Lanterns",
    center: "Residence Front Courtyard / Ancestral Tree Gen",
    description: "Family Residence ancestral Japanese estate manor surrounded by bamboo forests, torii gates, and shoji screens.",
  },
  familyresidencev1: {
    twelve_o_clock: "Yamaoka Family House / Shoji Screen Porch & Roof",
    three_o_clock: "East Bamboo Thicket / Stone Torii Gate",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Garden Pagoda / Stone Lanterns",
    center: "Residence Front Courtyard / Ancestral Tree Gen",
    description: "Family Residence ancestral Japanese estate manor surrounded by bamboo forests, torii gates, and shoji screens.",
  },
  familyresidenceii: {
    twelve_o_clock: "Yamaoka House / Shoji Hallways & Porch",
    three_o_clock: "East Torii Gate Path / Bamboo Forest",
    six_o_clock: "Killer Shack / South Estate Gate",
    nine_o_clock: "West Pagoda / Stone Lantern Garden",
    center: "Courtyard Garden / Ancestral Tree",
    description: "Family Residence II variant with modified outer bamboo grove paths and pagoda positioning.",
  },
  sanctumofwrath: {
    twelve_o_clock: "Sanctum Temple Shrine / Stone Guardian Statues",
    three_o_clock: "East Bamboo Forest / Torii Gate Path",
    six_o_clock: "Killer Shack / South Shrine Gate",
    nine_o_clock: "West Stone Lantern Garden / Pagoda",
    center: "Temple Stepped Basin / Ancestral Altar Gen",
    description: "Sanctum of Wrath grand mountain temple shrine dedicated to Kazan Yamaoka with stone dragon statues.",
  },
  sanctumofwrathv1: {
    twelve_o_clock: "Sanctum Temple Shrine / Stone Guardian Statues",
    three_o_clock: "East Bamboo Forest / Torii Gate Path",
    six_o_clock: "Killer Shack / South Shrine Gate",
    nine_o_clock: "West Stone Lantern Garden / Pagoda",
    center: "Temple Stepped Basin / Ancestral Altar Gen",
    description: "Sanctum of Wrath grand mountain temple shrine dedicated to Kazan Yamaoka with stone dragon statues.",
  },
  sanctumofwrathii: {
    twelve_o_clock: "Sanctum Shrine / Guardian Statues & Steps",
    three_o_clock: "East Bamboo Trail / Torii Gates",
    six_o_clock: "Killer Shack / South Gate",
    nine_o_clock: "West Stone Lantern Garden / Pagoda",
    center: "Central Altar Basin / Altar Generator",
    description: "Sanctum of Wrath II variant with adjusted shrine stairs and torii gate looping paths.",
  },
};

/**
 * Resolves rich 4-sector landmark callouts + center feature for any DBD map or realm.
 *
 * Lookup hierarchy:
 * 1. Exact map name match in `MAP_LANDMARKS_DICTIONARY`
 * 2. Realm fallback match in `REALM_LANDMARKS_DICTIONARY`
 * 3. Intelligent default directional landmark generation
 *
 * @param mapName The map name (e.g., "Azarov's Resting Place", "Coal Tower II")
 * @param realmName Optional realm name (e.g., "Autohaven Wreckers", "MacMillan Estate")
 * @param source Optional provider source ("hens333" | "samoelcolt" | "all")
 * @returns MapLandmarks with rich twelve_o_clock, three_o_clock, six_o_clock, nine_o_clock, center, and description.
 */
export function getMapLandmarks(
  mapName?: string,
  realmName?: string,
  source?: string
): MapLandmarks {
  const isSamoel = source === 'samoelcolt';
  const cleanMapName = (mapName || '').trim();
  const cleanRealmName = (realmName || '').trim();

  const normMapKey = normalizeLandmarkKey(cleanMapName);
  const normRealmKey = normalizeLandmarkKey(cleanRealmName);

  // 1. Check exact / normalized map match in MAP_LANDMARKS_DICTIONARY
  let matchedLandmarks: MapLandmarks | undefined = MAP_LANDMARKS_DICTIONARY[normMapKey];

  // If not found directly, try fuzzy/substring matches in map dictionary keys
  if (!matchedLandmarks && normMapKey.length >= 4) {
    for (const key of Object.keys(MAP_LANDMARKS_DICTIONARY)) {
      if (normMapKey.includes(key) || key.includes(normMapKey)) {
        matchedLandmarks = MAP_LANDMARKS_DICTIONARY[key];
        break;
      }
    }
  }

  // 2. Check realm fallback dictionary
  if (!matchedLandmarks && normRealmKey) {
    matchedLandmarks = REALM_LANDMARKS_DICTIONARY[normRealmKey];

    if (!matchedLandmarks) {
      for (const key of Object.keys(REALM_LANDMARKS_DICTIONARY)) {
        if (normRealmKey.includes(key) || key.includes(normRealmKey)) {
          matchedLandmarks = REALM_LANDMARKS_DICTIONARY[key];
          break;
        }
      }
    }
  }

  // 3. Fallback to intelligent directional landmarks if still unknown
  if (!matchedLandmarks) {
    matchedLandmarks = {
      twelve_o_clock: 'Main Landmark / North Exit Gate',
      three_o_clock: 'East Loop Tile / Generator Cluster',
      six_o_clock: 'Killer Shack & Basement / South Exit Gate',
      nine_o_clock: 'West Jungle Gym / Pallet Gym',
      center: 'Center Landmark / Central Generator',
      description: cleanMapName
        ? `Landmark layout and callouts for ${cleanMapName}${cleanRealmName ? ` (${cleanRealmName})` : ''}.`
        : 'Standard Dead by Daylight competitive sector navigation callouts.',
    };
  }

  // Format the description based on provider source
  let description = matchedLandmarks.description;
  if (!description) {
    if (isSamoel) {
      description = `SamoelColt Isometric Scheme for ${cleanMapName || 'Map'} (${cleanRealmName || 'Realm'}). Sector-based layout.`;
    } else {
      description = `12-Clock Callout System for ${cleanMapName || 'Map'} (${cleanRealmName || 'Realm'}). Standard top-middle starts at 12 o'clock.`;
    }
  } else if (isSamoel && !description.includes('Isometric')) {
    description = `SamoelColt Isometric Scheme for ${cleanMapName || 'Map'}. ${description}`;
  }

  return {
    twelve_o_clock: matchedLandmarks.twelve_o_clock,
    three_o_clock: matchedLandmarks.three_o_clock,
    six_o_clock: matchedLandmarks.six_o_clock,
    nine_o_clock: matchedLandmarks.nine_o_clock,
    center: matchedLandmarks.center || 'Central Spine / Center Generator',
    description,
  };
}
