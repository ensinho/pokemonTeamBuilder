import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.resolve(__dirname, '../public/data/gym-leaders.json');

const moveTypes = {
  "Stealth Rock": "rock", "Sandstorm": "rock", "Thunder Wave": "electric", "Shock Wave": "electric",
  "Brick Break": "fighting", "Rollout": "rock", "Defense Curl": "normal", "Bulldoze": "ground",
  "Rock Tomb": "rock", "Fire Punch": "fire", "Thunder Punch": "electric", "Bite": "dark",
  "Protect": "normal", "Zen Headbutt": "psychic", "Scary Face": "normal", "Bug Buzz": "bug",
  "Hurricane": "flying", "Giga Drain": "grass", "Bug Bite": "bug", "Iron Head": "steel",
  "Bullet Punch": "steel", "U-turn": "bug", "Megahorn": "bug", "Close Combat": "fighting",
  "Stone Edge": "rock", "Night Slash": "dark", "Attack Order": "bug", "Defend Order": "bug",
  "Heal Order": "bug", "X-Scissor": "bug", "Earthquake": "ground", "Aqua Tail": "water",
  "Cross Poison": "poison", "Crunch": "dark", "Slack Off": "normal", "Bounce": "flying",
  "Dragon Dance": "dragon", "Wing Attack": "flying", "Roost": "flying", "Explosion": "normal",
  "Play Rough": "fairy", "Head Smash": "rock", "Superpower": "fighting", "Ice Punch": "ice",
  "Overheat": "fire", "Solar Beam": "grass", "Moonblast": "fairy", "Confuse Ray": "ghost",
  "Fire Blast": "fire", "Dark Pulse": "dark", "Sludge Bomb": "poison", "Flare Blitz": "fire",
  "Wild Charge": "electric", "Drill Run": "ground", "Thunderbolt": "electric", "Aura Sphere": "fighting",
  "Psychic": "psychic", "Dazzling Gleam": "fairy", "Reflect": "psychic", "Light Screen": "psychic",
  "Power Gem": "rock", "Gyro Ball": "steel", "Shadow Ball": "ghost", "Energy Ball": "grass",
  "Meteor Mash": "steel", "Psycho Cut": "psychic", "Leaf Blade": "grass", "Will-O-Wisp": "fire",
  "Rest": "psychic", "Leaf Storm": "grass", "Sleep Powder": "grass", "Air Slash": "flying",
  "High Jump Kick": "fighting", "Extreme Speed": "normal", "Surf": "water", "Ice Beam": "ice",
  "Recover": "normal", "Hypnosis": "psychic", "Outrage": "dragon", "Swords Dance": "normal"
};

const newTrainers = [
  {
    "order": 9,
    "name": "Aaron",
    "sprite": "aaron",
    "gym": "Elite Four",
    "city": "Pokémon League",
    "type": "bug",
    "levelCap": 72,
    "team": [
      {
        "name": "Yanmega",
        "level": 71,
        "item": "Wise Glasses",
        "ability": "Speed Boost",
        "moves": ["Bug Buzz", "Hurricane", "Giga Drain", "Protect"]
      },
      {
        "name": "Scizor",
        "level": 71,
        "item": "Life Orb",
        "ability": "Technician",
        "moves": ["Bug Bite", "Iron Head", "Bullet Punch", "U-turn"]
      },
      {
        "name": "Heracross",
        "level": 71,
        "item": "Choice Scarf",
        "ability": "Guts",
        "moves": ["Megahorn", "Close Combat", "Stone Edge", "Night Slash"]
      },
      {
        "name": "Vespiquen",
        "level": 71,
        "item": "Leftovers",
        "ability": "Intimidate",
        "moves": ["Attack Order", "Defend Order", "Heal Order", "Hurricane"]
      },
      {
        "name": "Armaldo",
        "level": 71,
        "item": "Choice Band",
        "ability": "Battle Armor",
        "moves": ["X-Scissor", "Stone Edge", "Earthquake", "Aqua Tail"]
      },
      {
        "name": "Drapion",
        "level": 72,
        "item": "Scope Lens",
        "ability": "Sniper",
        "moves": ["Cross Poison", "Night Slash", "X-Scissor", "Earthquake"]
      }
    ]
  },
  {
    "order": 10,
    "name": "Bertha",
    "sprite": "bertha",
    "gym": "Elite Four",
    "city": "Pokémon League",
    "type": "ground",
    "levelCap": 73,
    "team": [
      {
        "name": "Hippowdon",
        "level": 72,
        "item": "Leftovers",
        "ability": "Sand Stream",
        "moves": ["Earthquake", "Crunch", "Stealth Rock", "Slack Off"]
      },
      {
        "name": "Whiscash",
        "level": 72,
        "item": "Life Orb",
        "ability": "Oblivious",
        "moves": ["Aqua Tail", "Earthquake", "Bounce", "Dragon Dance"]
      },
      {
        "name": "Gliscor",
        "level": 72,
        "item": "Toxic Orb",
        "ability": "Poison Heal",
        "moves": ["Earthquake", "Wing Attack", "Protect", "Roost"]
      },
      {
        "name": "Golem",
        "level": 72,
        "item": "Focus Sash",
        "ability": "Rock Head",
        "moves": ["Earthquake", "Stone Edge", "Thunder Punch", "Explosion"]
      },
      {
        "name": "Donphan",
        "level": 72,
        "item": "Rindo Berry",
        "ability": "Sand Veil",
        "moves": ["Earthquake", "Play Rough", "Head Smash", "Superpower"]
      },
      {
        "name": "Rhyperior",
        "level": 73,
        "item": "Choice Band",
        "ability": "Solid Rock",
        "moves": ["Earthquake", "Stone Edge", "Megahorn", "Ice Punch"]
      }
    ]
  },
  {
    "order": 11,
    "name": "Flint",
    "sprite": "flint",
    "gym": "Elite Four",
    "city": "Pokémon League",
    "type": "fire",
    "levelCap": 74,
    "team": [
      {
        "name": "Ninetales",
        "level": 73,
        "item": "White Herb",
        "ability": "Drought",
        "moves": ["Overheat", "Solar Beam", "Moonblast", "Confuse Ray"]
      },
      {
        "name": "Houndoom",
        "level": 73,
        "item": "Choice Scarf",
        "ability": "Intimidate",
        "moves": ["Fire Blast", "Dark Pulse", "Solar Beam", "Sludge Bomb"]
      },
      {
        "name": "Flareon",
        "level": 73,
        "item": "Choice Band",
        "ability": "Flash Fire",
        "moves": ["Flare Blitz", "Play Rough", "Wild Charge", "Close Combat"]
      },
      {
        "name": "Rapidash",
        "level": 73,
        "item": "Power Herb",
        "ability": "Flame Body",
        "moves": ["Flare Blitz", "Wild Charge", "Megahorn", "Drill Run"]
      },
      {
        "name": "Infernape",
        "level": 73,
        "item": "Expert Belt",
        "ability": "Iron Fist",
        "moves": ["Flare Blitz", "Close Combat", "Thunder Punch", "Grass Knot"]
      },
      {
        "name": "Magmortar",
        "level": 74,
        "item": "Life Orb",
        "ability": "Flame Body",
        "moves": ["Fire Blast", "Thunderbolt", "Aura Sphere", "Solar Beam"]
      }
    ]
  },
  {
    "order": 12,
    "name": "Lucian",
    "sprite": "lucian",
    "gym": "Elite Four",
    "city": "Pokémon League",
    "type": "psychic",
    "levelCap": 75,
    "team": [
      {
        "name": "Mr. Mime",
        "level": 74,
        "item": "Light Clay",
        "ability": "Filter",
        "moves": ["Psychic", "Dazzling Gleam", "Reflect", "Light Screen"]
      },
      {
        "name": "Espeon",
        "level": 74,
        "item": "Wise Glasses",
        "ability": "Synchronize",
        "moves": ["Psychic", "Dazzling Gleam", "Aura Sphere", "Power Gem"]
      },
      {
        "name": "Bronzong",
        "level": 74,
        "item": "Leftovers",
        "ability": "Levitate",
        "moves": ["Zen Headbutt", "Gyro Ball", "Reflect", "Light Screen"]
      },
      {
        "name": "Alakazam",
        "level": 74,
        "item": "Life Orb",
        "ability": "Magic Guard",
        "moves": ["Psychic", "Shadow Ball", "Energy Ball", "Aura Sphere"]
      },
      {
        "name": "Metagross",
        "level": 74,
        "item": "Muscle Band",
        "ability": "Iron Fist",
        "moves": ["Zen Headbutt", "Meteor Mash", "Earthquake", "Explosion"]
      },
      {
        "name": "Gallade",
        "level": 75,
        "item": "Scope Lens",
        "ability": "Steadfast",
        "moves": ["Psycho Cut", "Close Combat", "Leaf Blade", "Night Slash"]
      }
    ]
  },
  {
    "order": 13,
    "name": "Cynthia",
    "sprite": "cynthia",
    "gym": "Champion",
    "city": "Pokémon League",
    "type": "dragon",
    "levelCap": 78,
    "team": [
      {
        "name": "Spiritomb",
        "level": 77,
        "item": "Lum Berry",
        "ability": "Pressure",
        "moves": ["Dark Pulse", "Will-O-Wisp", "Confuse Ray", "Rest"]
      },
      {
        "name": "Roserade",
        "level": 77,
        "item": "White Herb",
        "ability": "Technician",
        "moves": ["Leaf Storm", "Sludge Bomb", "Dazzling Gleam", "Sleep Powder"]
      },
      {
        "name": "Togekiss",
        "level": 77,
        "item": "Sitrus Berry",
        "ability": "Serene Grace",
        "moves": ["Air Slash", "Thunder Wave", "Roost", "Moonblast"]
      },
      {
        "name": "Lucario",
        "level": 77,
        "item": "Life Orb",
        "ability": "Adaptability",
        "moves": ["High Jump Kick", "Meteor Mash", "Extreme Speed", "Ice Punch"]
      },
      {
        "name": "Milotic",
        "level": 77,
        "item": "Leftovers",
        "ability": "Marvel Scale",
        "moves": ["Surf", "Ice Beam", "Recover", "Hypnosis"]
      },
      {
        "name": "Garchomp",
        "level": 78,
        "item": "Yache Berry",
        "ability": "Rough Skin",
        "moves": ["Earthquake", "Outrage", "Stone Edge", "Swords Dance"]
      }
    ]
  }
];

// Enrich moves format
for (const trainer of newTrainers) {
  for (const mon of trainer.team) {
    mon.moves = mon.moves.map(m => {
      const type = moveTypes[m] || 'normal';
      return { name: m, type };
    });
  }
}

if (!fs.existsSync(jsonPath)) {
  console.error("gym-leaders.json not found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const rpGame = data.games.find(g => g.key === 'renegade-platinum');

if (!rpGame) {
  console.error("Renegade Platinum game not found in gym-leaders.json!");
  process.exit(1);
}

// Ensure we don't add duplicates
const existingLeadersMap = new Map(rpGame.leaders.map(l => [l.name, l]));
for (const newTrainer of newTrainers) {
  if (existingLeadersMap.has(newTrainer.name)) {
    // Overwrite existing or skip
    console.log(`Leader ${newTrainer.name} already exists. Replacing...`);
    const index = rpGame.leaders.findIndex(l => l.name === newTrainer.name);
    rpGame.leaders[index] = newTrainer;
  } else {
    console.log(`Adding Elite Four trainer: ${newTrainer.name}`);
    rpGame.leaders.push(newTrainer);
  }
}

fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
console.log("Successfully wrote updated gym-leaders.json");
