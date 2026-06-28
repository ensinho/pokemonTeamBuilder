import fs from 'node:fs';

const path = new URL('./public/data/gym-leaders.json', import.meta.url);
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

// Alola has no gyms — the Island Kahunas are the grand-trial bosses and the
// closest gym-leader equivalent. Grand-trial teams (NOT post-game rematch),
// verified against serebii.net + pokemondb.net.
const sunMoon = {
  key: 'sun-moon',
  label: 'Sun / Moon',
  kind: 'official',
  region: 'Alola',
  generation: 'generation-vii',
  source: 'serebii.net/sunmoon/grandtrials.shtml',
  leaders: [
    {
      order: 1, name: 'Hala', sprite: 'hala', gym: 'Melemele Grand Trial', city: 'Iki Town', type: 'fighting',
      team: [
        { name: 'Mankey', level: 14 },
        { name: 'Makuhita', level: 14 },
        { name: 'Crabrawler', level: 15 },
      ],
    },
    {
      order: 2, name: 'Olivia', sprite: 'olivia', gym: 'Akala Grand Trial', city: 'Ruins of Life', type: 'rock',
      team: [
        { name: 'Nosepass', level: 26 },
        { name: 'Boldore', level: 26 },
        { name: 'Lycanroc', level: 27 },
      ],
    },
    {
      order: 3, name: 'Nanu', sprite: 'nanu', gym: "Ula'ula Grand Trial", city: 'Malie City', type: 'dark',
      team: [
        { name: 'Sableye', level: 38 },
        { name: 'Krokorok', level: 38 },
        { name: 'Persian', level: 39 },
      ],
    },
    {
      order: 4, name: 'Hapu', sprite: 'hapu', gym: 'Poni Grand Trial', city: 'Exeggutor Island', type: 'ground',
      team: [
        { name: 'Dugtrio', level: 47 },
        { name: 'Gastrodon', level: 47 },
        { name: 'Flygon', level: 47 },
        { name: 'Mudsdale', level: 48 },
      ],
    },
  ],
};

const ultraSunMoon = {
  key: 'ultra-sun-ultra-moon',
  label: 'Ultra Sun / Ultra Moon',
  kind: 'official',
  region: 'Alola',
  generation: 'generation-vii',
  source: 'serebii.net/ultrasunultramoon/grandtrials.shtml',
  leaders: [
    {
      order: 1, name: 'Hala', sprite: 'hala', gym: 'Melemele Grand Trial', city: 'Iki Town', type: 'fighting',
      team: [
        { name: 'Machop', level: 15 },
        { name: 'Makuhita', level: 15 },
        { name: 'Crabrawler', level: 16 },
      ],
    },
    {
      order: 2, name: 'Olivia', sprite: 'olivia', gym: 'Akala Grand Trial', city: 'Ruins of Life', type: 'rock',
      team: [
        { name: 'Anorith', level: 27 },
        { name: 'Lileep', level: 27 },
        { name: 'Lycanroc', level: 28 },
      ],
    },
    {
      order: 3, name: 'Nanu', sprite: 'nanu', gym: "Ula'ula Grand Trial", city: 'Malie City', type: 'dark',
      team: [
        { name: 'Sableye', level: 43 },
        { name: 'Krokorok', level: 43 },
        { name: 'Persian', level: 44 },
      ],
    },
    {
      order: 4, name: 'Hapu', sprite: 'hapu', gym: 'Poni Grand Trial', city: 'Exeggutor Island', type: 'ground',
      team: [
        { name: 'Golurk', level: 53 },
        { name: 'Gastrodon', level: 53 },
        { name: 'Flygon', level: 53 },
        { name: 'Mudsdale', level: 54 },
      ],
    },
  ],
};

// Remove any prior copies (idempotent) then insert in Alola region order:
// after Kalos (x-y), before Galar (sword-shield).
data.games = data.games.filter((g) => g.key !== 'sun-moon' && g.key !== 'ultra-sun-ultra-moon');
let at = data.games.findIndex((g) => g.key === 'sword-shield');
if (at < 0) at = data.games.length;
data.games.splice(at, 0, sunMoon, ultraSunMoon);

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('games now:', data.games.length);
console.log('order:', data.games.map((g) => g.key).join(', '));
