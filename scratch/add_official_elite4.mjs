import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const jsonPath = path.resolve(__dirname, '../public/data/gym-leaders.json');

const eliteData = {
  "red-blue": [
    {
      "order": 9,
      "name": "Lorelei",
      "sprite": "lorelei",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "ice",
      "levelCap": 56,
      "team": [
        { "name": "Dewgong", "level": 54 },
        { "name": "Cloyster", "level": 53 },
        { "name": "Slowbro", "level": 54 },
        { "name": "Jynx", "level": 56 },
        { "name": "Lapras", "level": 56 }
      ]
    },
    {
      "order": 10,
      "name": "Bruno",
      "sprite": "bruno",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "fighting",
      "levelCap": 58,
      "team": [
        { "name": "Onix", "level": 53 },
        { "name": "Hitmonchan", "level": 55 },
        { "name": "Hitmonlee", "level": 55 },
        { "name": "Onix", "level": 56 },
        { "name": "Machamp", "level": 58 }
      ]
    },
    {
      "order": 11,
      "name": "Agatha",
      "sprite": "agatha",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "ghost",
      "levelCap": 60,
      "team": [
        { "name": "Gengar", "level": 56 },
        { "name": "Golbat", "level": 56 },
        { "name": "Haunter", "level": 55 },
        { "name": "Arbok", "level": 58 },
        { "name": "Gengar", "level": 60 }
      ]
    },
    {
      "order": 12,
      "name": "Lance",
      "sprite": "lance",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "dragon",
      "levelCap": 62,
      "team": [
        { "name": "Gyarados", "level": 58 },
        { "name": "Dragonair", "level": 56 },
        { "name": "Dragonair", "level": 56 },
        { "name": "Aerodactyl", "level": 60 },
        { "name": "Dragonite", "level": 62 }
      ]
    },
    {
      "order": 13,
      "name": "Blue",
      "sprite": "blue",
      "gym": "Champion",
      "city": "Indigo Plateau",
      "type": "normal",
      "levelCap": 65,
      "team": [
        { "name": "Pidgeot", "level": 61 },
        { "name": "Alakazam", "level": 59 },
        { "name": "Rhydon", "level": 61 },
        { "name": "Exeggutor", "level": 61 },
        { "name": "Arcanine", "level": 61 },
        { "name": "Charizard", "level": 65 }
      ]
    }
  ],
  "lets-go": [
    {
      "order": 9,
      "name": "Lorelei",
      "sprite": "lorelei",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "ice",
      "levelCap": 52,
      "team": [
        { "name": "Dewgong", "level": 51 },
        { "name": "Cloyster", "level": 51 },
        { "name": "Slowbro", "level": 51 },
        { "name": "Jynx", "level": 51 },
        { "name": "Lapras", "level": 52 }
      ]
    },
    {
      "order": 10,
      "name": "Bruno",
      "sprite": "bruno",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "fighting",
      "levelCap": 53,
      "team": [
        { "name": "Onix", "level": 52 },
        { "name": "Hitmonchan", "level": 52 },
        { "name": "Hitmonlee", "level": 52 },
        { "name": "Poliwrath", "level": 52 },
        { "name": "Machamp", "level": 53 }
      ]
    },
    {
      "order": 11,
      "name": "Agatha",
      "sprite": "agatha",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "ghost",
      "levelCap": 54,
      "team": [
        { "name": "Arbok", "level": 53 },
        { "name": "Golbat", "level": 53 },
        { "name": "Weezing", "level": 53 },
        { "name": "Marowak-alola", "level": 53 },
        { "name": "Gengar", "level": 54 }
      ]
    },
    {
      "order": 12,
      "name": "Lance",
      "sprite": "lance",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "dragon",
      "levelCap": 55,
      "team": [
        { "name": "Seadra", "level": 54 },
        { "name": "Aerodactyl", "level": 54 },
        { "name": "Gyarados", "level": 54 },
        { "name": "Charizard", "level": 54 },
        { "name": "Dragonite", "level": 55 }
      ]
    },
    {
      "order": 13,
      "name": "Trace",
      "sprite": "blue",
      "gym": "Champion",
      "city": "Indigo Plateau",
      "type": "normal",
      "levelCap": 57,
      "team": [
        { "name": "Pidgeot", "level": 56 },
        { "name": "Vileplume", "level": 56 },
        { "name": "Marowak", "level": 56 },
        { "name": "Rapidash", "level": 56 },
        { "name": "Slowbro", "level": 56 },
        { "name": "Jolteon", "level": 57 }
      ]
    }
  ],
  "gold-silver": [
    {
      "order": 9,
      "name": "Will",
      "sprite": "will",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "psychic",
      "levelCap": 42,
      "team": [
        { "name": "Xatu", "level": 40 },
        { "name": "Jynx", "level": 41 },
        { "name": "Exeggutor", "level": 41 },
        { "name": "Slowbro", "level": 41 },
        { "name": "Xatu", "level": 42 }
      ]
    },
    {
      "order": 10,
      "name": "Koga",
      "sprite": "koga",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "poison",
      "levelCap": 44,
      "team": [
        { "name": "Ariados", "level": 40 },
        { "name": "Forretress", "level": 43 },
        { "name": "Muk", "level": 42 },
        { "name": "Venomoth", "level": 41 },
        { "name": "Crobat", "level": 44 }
      ]
    },
    {
      "order": 11,
      "name": "Bruno",
      "sprite": "bruno",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "fighting",
      "levelCap": 46,
      "team": [
        { "name": "Hitmontop", "level": 42 },
        { "name": "Hitmonlee", "level": 42 },
        { "name": "Hitmonchan", "level": 42 },
        { "name": "Onix", "level": 43 },
        { "name": "Machamp", "level": 46 }
      ]
    },
    {
      "order": 12,
      "name": "Karen",
      "sprite": "karen",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "dark",
      "levelCap": 47,
      "team": [
        { "name": "Umbreon", "level": 42 },
        { "name": "Vileplume", "level": 45 },
        { "name": "Gengar", "level": 45 },
        { "name": "Murkrow", "level": 44 },
        { "name": "Houndoom", "level": 47 }
      ]
    },
    {
      "order": 13,
      "name": "Lance",
      "sprite": "lance",
      "gym": "Champion",
      "city": "Indigo Plateau",
      "type": "dragon",
      "levelCap": 50,
      "team": [
        { "name": "Gyarados", "level": 44 },
        { "name": "Dragonite", "level": 47 },
        { "name": "Dragonite", "level": 47 },
        { "name": "Aerodactyl", "level": 46 },
        { "name": "Charizard", "level": 46 },
        { "name": "Dragonite", "level": 50 }
      ]
    }
  ],
  "heartgold-soulsilver": [
    {
      "order": 9,
      "name": "Will",
      "sprite": "will",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "psychic",
      "levelCap": 42,
      "team": [
        { "name": "Xatu", "level": 40 },
        { "name": "Jynx", "level": 41 },
        { "name": "Exeggutor", "level": 41 },
        { "name": "Slowbro", "level": 41 },
        { "name": "Xatu", "level": 42 }
      ]
    },
    {
      "order": 10,
      "name": "Koga",
      "sprite": "koga",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "poison",
      "levelCap": 44,
      "team": [
        { "name": "Ariados", "level": 40 },
        { "name": "Forretress", "level": 43 },
        { "name": "Muk", "level": 42 },
        { "name": "Venomoth", "level": 41 },
        { "name": "Crobat", "level": 44 }
      ]
    },
    {
      "order": 11,
      "name": "Bruno",
      "sprite": "bruno",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "fighting",
      "levelCap": 46,
      "team": [
        { "name": "Hitmontop", "level": 42 },
        { "name": "Hitmonlee", "level": 42 },
        { "name": "Hitmonchan", "level": 42 },
        { "name": "Onix", "level": 43 },
        { "name": "Machamp", "level": 46 }
      ]
    },
    {
      "order": 12,
      "name": "Karen",
      "sprite": "karen",
      "gym": "Elite Four",
      "city": "Indigo Plateau",
      "type": "dark",
      "levelCap": 47,
      "team": [
        { "name": "Umbreon", "level": 42 },
        { "name": "Vileplume", "level": 45 },
        { "name": "Gengar", "level": 45 },
        { "name": "Murkrow", "level": 44 },
        { "name": "Houndoom", "level": 47 }
      ]
    },
    {
      "order": 13,
      "name": "Lance",
      "sprite": "lance",
      "gym": "Champion",
      "city": "Indigo Plateau",
      "type": "dragon",
      "levelCap": 50,
      "team": [
        { "name": "Gyarados", "level": 44 },
        { "name": "Dragonite", "level": 47 },
        { "name": "Dragonite", "level": 47 },
        { "name": "Aerodactyl", "level": 46 },
        { "name": "Charizard", "level": 46 },
        { "name": "Dragonite", "level": 50 }
      ]
    }
  ],
  "ruby-sapphire": [
    {
      "order": 9,
      "name": "Sidney",
      "sprite": "sidney",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "dark",
      "levelCap": 49,
      "team": [
        { "name": "Mightyena", "level": 46 },
        { "name": "Cacturne", "level": 46 },
        { "name": "Shiftry", "level": 48 },
        { "name": "Sharpedo", "level": 48 },
        { "name": "Absol", "level": 49 }
      ]
    },
    {
      "order": 10,
      "name": "Phoebe",
      "sprite": "phoebe",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "ghost",
      "levelCap": 50,
      "team": [
        { "name": "Dusclops", "level": 48 },
        { "name": "Banette", "level": 49 },
        { "name": "Sableye", "level": 48 },
        { "name": "Banette", "level": 49 },
        { "name": "Dusclops", "level": 50 }
      ]
    },
    {
      "order": 11,
      "name": "Glacia",
      "sprite": "glacia",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "ice",
      "levelCap": 53,
      "team": [
        { "name": "Glalie", "level": 50 },
        { "name": "Sealeo", "level": 50 },
        { "name": "Sealeo", "level": 52 },
        { "name": "Glalie", "level": 52 },
        { "name": "Walrein", "level": 53 }
      ]
    },
    {
      "order": 12,
      "name": "Drake",
      "sprite": "drake",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "dragon",
      "levelCap": 55,
      "team": [
        { "name": "Shelgon", "level": 52 },
        { "name": "Altaria", "level": 54 },
        { "name": "Flygon", "level": 53 },
        { "name": "Flygon", "level": 53 },
        { "name": "Salamence", "level": 55 }
      ]
    },
    {
      "order": 13,
      "name": "Steven",
      "sprite": "steven",
      "gym": "Champion",
      "city": "Ever Grande City",
      "type": "steel",
      "levelCap": 58,
      "team": [
        { "name": "Skarmory", "level": 57 },
        { "name": "Claydol", "level": 55 },
        { "name": "Aggron", "level": 56 },
        { "name": "Cradily", "level": 56 },
        { "name": "Armaldo", "level": 56 },
        { "name": "Metagross", "level": 58 }
      ]
    }
  ],
  "omega-ruby-alpha-sapphire": [
    {
      "order": 9,
      "name": "Sidney",
      "sprite": "sidney",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "dark",
      "levelCap": 52,
      "team": [
        { "name": "Mightyena", "level": 50 },
        { "name": "Shiftry", "level": 50 },
        { "name": "Cacturne", "level": 50 },
        { "name": "Sharpedo", "level": 50 },
        { "name": "Absol", "level": 52 }
      ]
    },
    {
      "order": 10,
      "name": "Phoebe",
      "sprite": "phoebe",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "ghost",
      "levelCap": 53,
      "team": [
        { "name": "Dusclops", "level": 51 },
        { "name": "Banette", "level": 51 },
        { "name": "Sableye", "level": 51 },
        { "name": "Banette", "level": 51 },
        { "name": "Dusknoir", "level": 53 }
      ]
    },
    {
      "order": 11,
      "name": "Glacia",
      "sprite": "glacia",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "ice",
      "levelCap": 54,
      "team": [
        { "name": "Froslass", "level": 52 },
        { "name": "Glalie", "level": 52 },
        { "name": "Froslass", "level": 52 },
        { "name": "Glalie", "level": 52 },
        { "name": "Walrein", "level": 54 }
      ]
    },
    {
      "order": 12,
      "name": "Drake",
      "sprite": "drake",
      "gym": "Elite Four",
      "city": "Ever Grande City",
      "type": "dragon",
      "levelCap": 55,
      "team": [
        { "name": "Altaria", "level": 53 },
        { "name": "Flygon", "level": 53 },
        { "name": "Kingdra", "level": 53 },
        { "name": "Flygon", "level": 53 },
        { "name": "Salamence", "level": 55 }
      ]
    },
    {
      "order": 13,
      "name": "Steven",
      "sprite": "steven",
      "gym": "Champion",
      "city": "Ever Grande City",
      "type": "steel",
      "levelCap": 59,
      "team": [
        { "name": "Skarmory", "level": 57 },
        { "name": "Claydol", "level": 55 },
        { "name": "Aggron", "level": 56 },
        { "name": "Cradily", "level": 56 },
        { "name": "Armaldo", "level": 56 },
        { "name": "Metagross", "level": 59 }
      ]
    }
  ],
  "diamond-pearl": [
    {
      "order": 9,
      "name": "Aaron",
      "sprite": "aaron",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "bug",
      "levelCap": 57,
      "team": [
        { "name": "Dustox", "level": 53 },
        { "name": "Beautifly", "level": 53 },
        { "name": "Vespiquen", "level": 54 },
        { "name": "Heracross", "level": 54 },
        { "name": "Drapion", "level": 57 }
      ]
    },
    {
      "order": 10,
      "name": "Bertha",
      "sprite": "bertha",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ground",
      "levelCap": 59,
      "team": [
        { "name": "Quagsire", "level": 55 },
        { "name": "Sudowoodo", "level": 56 },
        { "name": "Whiscash", "level": 55 },
        { "name": "Golem", "level": 56 },
        { "name": "Hippowdon", "level": 59 }
      ]
    },
    {
      "order": 11,
      "name": "Flint",
      "sprite": "flint",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fire",
      "levelCap": 61,
      "team": [
        { "name": "Rapidash", "level": 58 },
        { "name": "Steelix", "level": 57 },
        { "name": "Drifblim", "level": 58 },
        { "name": "Lopunny", "level": 57 },
        { "name": "Infernape", "level": 61 }
      ]
    },
    {
      "order": 12,
      "name": "Lucian",
      "sprite": "lucian",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "psychic",
      "levelCap": 63,
      "team": [
        { "name": "Mr. Mime", "level": 59 },
        { "name": "Girafarig", "level": 59 },
        { "name": "Medicham", "level": 60 },
        { "name": "Alakazam", "level": 60 },
        { "name": "Bronzong", "level": 63 }
      ]
    },
    {
      "order": 13,
      "name": "Cynthia",
      "sprite": "cynthia",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 66,
      "team": [
        { "name": "Spiritomb", "level": 61 },
        { "name": "Roserade", "level": 60 },
        { "name": "Gastrodon", "level": 60 },
        { "name": "Lucario", "level": 63 },
        { "name": "Milotic", "level": 63 },
        { "name": "Garchomp", "level": 66 }
      ]
    }
  ],
  "platinum": [
    {
      "order": 9,
      "name": "Aaron",
      "sprite": "aaron",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "bug",
      "levelCap": 53,
      "team": [
        { "name": "Yanmega", "level": 49 },
        { "name": "Scizor", "level": 49 },
        { "name": "Vespiquen", "level": 50 },
        { "name": "Heracross", "level": 51 },
        { "name": "Drapion", "level": 53 }
      ]
    },
    {
      "order": 10,
      "name": "Bertha",
      "sprite": "bertha",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ground",
      "levelCap": 55,
      "team": [
        { "name": "Whiscash", "level": 50 },
        { "name": "Gliscor", "level": 53 },
        { "name": "Hippowdon", "level": 52 },
        { "name": "Golem", "level": 52 },
        { "name": "Rhyperior", "level": 55 }
      ]
    },
    {
      "order": 11,
      "name": "Flint",
      "sprite": "flint",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fire",
      "levelCap": 57,
      "team": [
        { "name": "Houndoom", "level": 52 },
        { "name": "Flareon", "level": 55 },
        { "name": "Rapidash", "level": 53 },
        { "name": "Magmortar", "level": 57 },
        { "name": "Infernape", "level": 55 }
      ]
    },
    {
      "order": 12,
      "name": "Lucian",
      "sprite": "lucian",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "psychic",
      "levelCap": 59,
      "team": [
        { "name": "Mr. Mime", "level": 53 },
        { "name": "Espeon", "level": 55 },
        { "name": "Bronzong", "level": 54 },
        { "name": "Alakazam", "level": 56 },
        { "name": "Gallade", "level": 59 }
      ]
    },
    {
      "order": 13,
      "name": "Cynthia",
      "sprite": "cynthia",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 62,
      "team": [
        { "name": "Spiritomb", "level": 58 },
        { "name": "Roserade", "level": 58 },
        { "name": "Togekiss", "level": 60 },
        { "name": "Lucario", "level": 60 },
        { "name": "Milotic", "level": 58 },
        { "name": "Garchomp", "level": 62 }
      ]
    }
  ],
  "brilliant-diamond-shining-pearl": [
    {
      "order": 9,
      "name": "Aaron",
      "sprite": "aaron",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "bug",
      "levelCap": 57,
      "team": [
        { "name": "Dustox", "level": 53 },
        { "name": "Beautifly", "level": 53 },
        { "name": "Vespiquen", "level": 54 },
        { "name": "Heracross", "level": 54 },
        { "name": "Drapion", "level": 57 }
      ]
    },
    {
      "order": 10,
      "name": "Bertha",
      "sprite": "bertha",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ground",
      "levelCap": 59,
      "team": [
        { "name": "Quagsire", "level": 55 },
        { "name": "Sudowoodo", "level": 56 },
        { "name": "Whiscash", "level": 55 },
        { "name": "Golem", "level": 56 },
        { "name": "Hippowdon", "level": 59 }
      ]
    },
    {
      "order": 11,
      "name": "Flint",
      "sprite": "flint",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fire",
      "levelCap": 61,
      "team": [
        { "name": "Rapidash", "level": 58 },
        { "name": "Steelix", "level": 57 },
        { "name": "Drifblim", "level": 58 },
        { "name": "Lopunny", "level": 57 },
        { "name": "Infernape", "level": 61 }
      ]
    },
    {
      "order": 12,
      "name": "Lucian",
      "sprite": "lucian",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "psychic",
      "levelCap": 63,
      "team": [
        { "name": "Mr. Mime", "level": 59 },
        { "name": "Girafarig", "level": 59 },
        { "name": "Medicham", "level": 60 },
        { "name": "Alakazam", "level": 60 },
        { "name": "Bronzong", "level": 63 }
      ]
    },
    {
      "order": 13,
      "name": "Cynthia",
      "sprite": "cynthia",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 66,
      "team": [
        { "name": "Spiritomb", "level": 61 },
        { "name": "Roserade", "level": 60 },
        { "name": "Gastrodon", "level": 60 },
        { "name": "Lucario", "level": 63 },
        { "name": "Milotic", "level": 63 },
        { "name": "Garchomp", "level": 66 }
      ]
    }
  ],
  "black-white": [
    {
      "order": 9,
      "name": "Shauntal",
      "sprite": "shauntal",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ghost",
      "levelCap": 50,
      "team": [
        { "name": "Cofagrigus", "level": 48 },
        { "name": "Jellicent", "level": 48 },
        { "name": "Golurk", "level": 48 },
        { "name": "Chandelure", "level": 50 }
      ]
    },
    {
      "order": 10,
      "name": "Grimsley",
      "sprite": "grimsley",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "dark",
      "levelCap": 50,
      "team": [
        { "name": "Liepard", "level": 48 },
        { "name": "Scrafty", "level": 48 },
        { "name": "Krookodile", "level": 48 },
        { "name": "Bisharp", "level": 50 }
      ]
    },
    {
      "order": 11,
      "name": "Caitlin",
      "sprite": "caitlin",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "psychic",
      "levelCap": 50,
      "team": [
        { "name": "Reuniclus", "level": 48 },
        { "name": "Musharna", "level": 48 },
        { "name": "Sigilyph", "level": 48 },
        { "name": "Gothitelle", "level": 50 }
      ]
    },
    {
      "order": 12,
      "name": "Marshal",
      "sprite": "marshal",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fighting",
      "levelCap": 50,
      "team": [
        { "name": "Throh", "level": 48 },
        { "name": "Sawk", "level": 48 },
        { "name": "Mienshao", "level": 48 },
        { "name": "Conkeldurr", "level": 50 }
      ]
    },
    {
      "order": 13,
      "name": "Alder",
      "sprite": "alder",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "bug",
      "levelCap": 77,
      "team": [
        { "name": "Accelgor", "level": 75 },
        { "name": "Bouffalant", "level": 75 },
        { "name": "Druddigon", "level": 75 },
        { "name": "Vanilluxe", "level": 75 },
        { "name": "Escavalier", "level": 75 },
        { "name": "Volcarona", "level": 77 }
      ]
    }
  ],
  "black-white-2": [
    {
      "order": 9,
      "name": "Shauntal",
      "sprite": "shauntal",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ghost",
      "levelCap": 58,
      "team": [
        { "name": "Cofagrigus", "level": 56 },
        { "name": "Drifblim", "level": 56 },
        { "name": "Golurk", "level": 56 },
        { "name": "Chandelure", "level": 58 }
      ]
    },
    {
      "order": 10,
      "name": "Grimsley",
      "sprite": "grimsley",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "dark",
      "levelCap": 58,
      "team": [
        { "name": "Liepard", "level": 56 },
        { "name": "Scrafty", "level": 56 },
        { "name": "Krookodile", "level": 56 },
        { "name": "Bisharp", "level": 58 }
      ]
    },
    {
      "order": 11,
      "name": "Caitlin",
      "sprite": "caitlin",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "psychic",
      "levelCap": 58,
      "team": [
        { "name": "Musharna", "level": 56 },
        { "name": "Sigilyph", "level": 56 },
        { "name": "Reuniclus", "level": 56 },
        { "name": "Gothitelle", "level": 58 }
      ]
    },
    {
      "order": 12,
      "name": "Marshal",
      "sprite": "marshal",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fighting",
      "levelCap": 58,
      "team": [
        { "name": "Throh", "level": 56 },
        { "name": "Sawk", "level": 56 },
        { "name": "Mienshao", "level": 56 },
        { "name": "Conkeldurr", "level": 58 }
      ]
    },
    {
      "order": 13,
      "name": "Iris",
      "sprite": "iris",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 59,
      "team": [
        { "name": "Hydreigon", "level": 57 },
        { "name": "Druddigon", "level": 57 },
        { "name": "Archeops", "level": 57 },
        { "name": "Aggron", "level": 57 },
        { "name": "Lapras", "level": 57 },
        { "name": "Haxorus", "level": 59 }
      ]
    }
  ],
  "x-y": [
    {
      "order": 9,
      "name": "Malva",
      "sprite": "malva",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fire",
      "levelCap": 65,
      "team": [
        { "name": "Pyroar", "level": 63 },
        { "name": "Torkoal", "level": 63 },
        { "name": "Chandelure", "level": 63 },
        { "name": "Talonflame", "level": 65 }
      ]
    },
    {
      "order": 10,
      "name": "Siebold",
      "sprite": "siebold",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "water",
      "levelCap": 65,
      "team": [
        { "name": "Clawitzer", "level": 63 },
        { "name": "Barbaracle", "level": 63 },
        { "name": "Starmie", "level": 63 },
        { "name": "Gyarados", "level": 65 }
      ]
    },
    {
      "order": 11,
      "name": "Wikstrom",
      "sprite": "wikstrom",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "steel",
      "levelCap": 65,
      "team": [
        { "name": "Klefki", "level": 63 },
        { "name": "Probopass", "level": 63 },
        { "name": "Scizor", "level": 63 },
        { "name": "Aegislash", "level": 65 }
      ]
    },
    {
      "order": 12,
      "name": "Drasna",
      "sprite": "drasna",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 65,
      "team": [
        { "name": "Dragalge", "level": 63 },
        { "name": "Druddigon", "level": 63 },
        { "name": "Altaria", "level": 63 },
        { "name": "Noivern", "level": 65 }
      ]
    },
    {
      "order": 13,
      "name": "Diantha",
      "sprite": "diantha",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "fairy",
      "levelCap": 68,
      "team": [
        { "name": "Hawlucha", "level": 64 },
        { "name": "Tyrantrum", "level": 65 },
        { "name": "Aurorus", "level": 65 },
        { "name": "Gourgeist", "level": 65 },
        { "name": "Goodra", "level": 66 },
        { "name": "Gardevoir", "level": 68 }
      ]
    }
  ],
  "sun-moon": [
    {
      "order": 5,
      "name": "Hala",
      "sprite": "hala",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "fighting",
      "levelCap": 55,
      "team": [
        { "name": "Primeape", "level": 54 },
        { "name": "Bewear", "level": 54 },
        { "name": "Poliwrath", "level": 54 },
        { "name": "Hariyama", "level": 54 },
        { "name": "Crabominable", "level": 55 }
      ]
    },
    {
      "order": 6,
      "name": "Olivia",
      "sprite": "olivia",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "rock",
      "levelCap": 55,
      "team": [
        { "name": "Relicanth", "level": 54 },
        { "name": "Carbink", "level": 54 },
        { "name": "Golem-alola", "level": 54 },
        { "name": "Lycanroc", "level": 54 },
        { "name": "Lycanroc-midnight", "level": 55 }
      ]
    },
    {
      "order": 7,
      "name": "Acerola",
      "sprite": "acerola",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ghost",
      "levelCap": 55,
      "team": [
        { "name": "Sableye", "level": 54 },
        { "name": "Drifblim", "level": 54 },
        { "name": "Dhelmise", "level": 54 },
        { "name": "Froslass", "level": 54 },
        { "name": "Palossand", "level": 55 }
      ]
    },
    {
      "order": 8,
      "name": "Kahili",
      "sprite": "kahili",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "flying",
      "levelCap": 55,
      "team": [
        { "name": "Skarmory", "level": 54 },
        { "name": "Crobat", "level": 54 },
        { "name": "Oricorio", "level": 54 },
        { "name": "Mandibuzz", "level": 54 },
        { "name": "Toucannon", "level": 55 }
      ]
    },
    {
      "order": 9,
      "name": "Professor Kukui",
      "sprite": "kukui",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "normal",
      "levelCap": 58,
      "team": [
        { "name": "Lycanroc", "level": 57 },
        { "name": "Alolan Ninetales", "level": 56 },
        { "name": "Braviary", "level": 56 },
        { "name": "Magnezone", "level": 56 },
        { "name": "Snorlax", "level": 56 },
        { "name": "Incineroar", "level": 58 }
      ]
    }
  ],
  "ultra-sun-ultra-moon": [
    {
      "order": 5,
      "name": "Molayne",
      "sprite": "molayne",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "steel",
      "levelCap": 57,
      "team": [
        { "name": "Klefki", "level": 56 },
        { "name": "Bisharp", "level": 56 },
        { "name": "Magnezone", "level": 56 },
        { "name": "Metagross", "level": 56 },
        { "name": "Dugtrio-alola", "level": 57 }
      ]
    },
    {
      "order": 6,
      "name": "Olivia",
      "sprite": "olivia",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "rock",
      "levelCap": 57,
      "team": [
        { "name": "Armaldo", "level": 56 },
        { "name": "Cradily", "level": 56 },
        { "name": "Gigalith", "level": 56 },
        { "name": "Lycanroc", "level": 56 },
        { "name": "Lycanroc-midnight", "level": 57 }
      ]
    },
    {
      "order": 7,
      "name": "Acerola",
      "sprite": "acerola",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ghost",
      "levelCap": 57,
      "team": [
        { "name": "Banette", "level": 56 },
        { "name": "Drifblim", "level": 56 },
        { "name": "Dhelmise", "level": 56 },
        { "name": "Froslass", "level": 56 },
        { "name": "Palossand", "level": 57 }
      ]
    },
    {
      "order": 8,
      "name": "Kahili",
      "sprite": "kahili",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "flying",
      "levelCap": 57,
      "team": [
        { "name": "Braviary", "level": 56 },
        { "name": "Hawlucha", "level": 56 },
        { "name": "Mandibuzz", "level": 56 },
        { "name": "Oricorio", "level": 56 },
        { "name": "Toucannon", "level": 57 }
      ]
    },
    {
      "order": 9,
      "name": "Hau",
      "sprite": "hau",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "normal",
      "levelCap": 60,
      "team": [
        { "name": "Raichu-alola", "level": 59 },
        { "name": "Tauros", "level": 58 },
        { "name": "Noivern", "level": 58 },
        { "name": "Leafeon", "level": 58 },
        { "name": "Crabominable", "level": 59 },
        { "name": "Incineroar", "level": 60 }
      ]
    }
  ],
  "sword-shield": [
    {
      "order": 9,
      "name": "Leon",
      "sprite": "leon",
      "gym": "Champion",
      "city": "Wyndon Stadium",
      "type": "fire",
      "levelCap": 65,
      "team": [
        { "name": "Aegislash", "level": 62 },
        { "name": "Dragapult", "level": 62 },
        { "name": "Haxorus", "level": 63 },
        { "name": "Seismitoad", "level": 64 },
        { "name": "Mr-rime", "level": 64 },
        { "name": "Charizard", "level": 65 }
      ]
    }
  ],
  "scarlet-violet": [
    {
      "order": 9,
      "name": "Rika",
      "sprite": "rika",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "ground",
      "levelCap": 58,
      "team": [
        { "name": "Whiscash", "level": 57 },
        { "name": "Camerupt", "level": 57 },
        { "name": "Donphan", "level": 57 },
        { "name": "Dugtrio", "level": 57 },
        { "name": "Clodsire", "level": 58 }
      ]
    },
    {
      "order": 10,
      "name": "Poppy",
      "sprite": "poppy",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "steel",
      "levelCap": 59,
      "team": [
        { "name": "Copperajah", "level": 58 },
        { "name": "Bronzong", "level": 58 },
        { "name": "Corviknight", "level": 58 },
        { "name": "Magnezone", "level": 58 },
        { "name": "Tinkaton", "level": 59 }
      ]
    },
    {
      "order": 11,
      "name": "Larry",
      "sprite": "larry",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "flying",
      "levelCap": 60,
      "team": [
        { "name": "Staraptor", "level": 59 },
        { "name": "Tropius", "level": 59 },
        { "name": "Oricorio-pom-pom", "level": 59 },
        { "name": "Altaria", "level": 59 },
        { "name": "Flamigo", "level": 60 }
      ]
    },
    {
      "order": 12,
      "name": "Hassel",
      "sprite": "hassel",
      "gym": "Elite Four",
      "city": "Pokémon League",
      "type": "dragon",
      "levelCap": 61,
      "team": [
        { "name": "Noivern", "level": 60 },
        { "name": "Haxorus", "level": 60 },
        { "name": "Dragalge", "level": 60 },
        { "name": "Flapple", "level": 60 },
        { "name": "Baxcalibur", "level": 61 }
      ]
    },
    {
      "order": 13,
      "name": "Geeta",
      "sprite": "geeta",
      "gym": "Champion",
      "city": "Pokémon League",
      "type": "rock",
      "levelCap": 62,
      "team": [
        { "name": "Espathra", "level": 61 },
        { "name": "Gogoat", "level": 61 },
        { "name": "Veluza", "level": 61 },
        { "name": "Avalugg", "level": 61 },
        { "name": "Kingambit", "level": 61 },
        { "name": "Glimmora", "level": 62 }
      ]
    }
  ]
};

if (!fs.existsSync(jsonPath)) {
  console.error("gym-leaders.json not found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

for (const gameKey of Object.keys(eliteData)) {
  const game = data.games.find(g => g.key === gameKey);
  if (!game) {
    console.warn(`Game not found in database: ${gameKey}`);
    continue;
  }

  const trainers = eliteData[gameKey];
  for (const trainer of trainers) {
    const existingIndex = game.leaders.findIndex(l => l.name === trainer.name && l.gym === trainer.gym);
    if (existingIndex !== -1) {
      console.log(`[${gameKey}] Leader ${trainer.name} (${trainer.gym}) already exists. Updating...`);
      // Preserve moves if already present
      const existing = game.leaders[existingIndex];
      trainer.team = trainer.team.map(mon => {
        const extMon = existing.team.find(m => m.name === mon.name);
        if (extMon && extMon.moves) {
          mon.moves = extMon.moves;
        }
        return mon;
      });
      game.leaders[existingIndex] = trainer;
    } else {
      console.log(`[${gameKey}] Adding ${trainer.gym} ${trainer.name}`);
      game.leaders.push(trainer);
    }
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log("Successfully wrote official Elite Four and Champions to gym-leaders.json");
