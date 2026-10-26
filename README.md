<div align="center">

# PokeBuilder

**[pokemonbuilder.app](https://pokemonbuilder.app)**

### Build better Pokémon teams. Faster.

Live type coverage, a complete Pokédex and competitive tools, all in one place.

<img src=".github/assets/demo.gif" width="100%" alt="pokemonbuilder.app demo: building a team and seeing its weaknesses and resistances update live">

<br/>

[![Live](https://img.shields.io/badge/Try_it_live-pokemonbuilder.app-7C6AE8?style=for-the-badge&labelColor=4C3FA0)](https://pokemonbuilder.app)
&nbsp;
[![PWA](https://img.shields.io/badge/Installable-PWA-7C6AE8?style=for-the-badge&logo=pwa&logoColor=white&labelColor=4C3FA0)](https://pokemonbuilder.app)

<sub>Free &nbsp;·&nbsp; No ads &nbsp;·&nbsp; No sign-up required &nbsp;·&nbsp; Mobile-ready</sub>

</div>

---

## Features

<table>
<tr>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/hammer.svg?color=%237C6AE8" width="28" alt="">

**Team Builder**<br/>
See weaknesses, resistances and coverage gaps update as you add each Pokémon. Set abilities, natures, Tera types, EVs/IVs and moves, then export to Showdown in one click.

</td>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/book-open.svg?color=%237C6AE8" width="28" alt="">

**Complete Pokédex**<br/>
All 1025 Pokémon, filtered instantly by type and generation. Stats, evolutions, sprites and encounter locations for every game, plus full move, ability and item databases.

</td>
</tr>
<tr>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/trophy.svg?color=%237C6AE8" width="28" alt="">

**Competitive Toolkit**<br/>
Damage calculator, speed tiers, meta usage stats and winning teams from recent tournaments.

</td>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/swords.svg?color=%237C6AE8" width="28" alt="">

**Async Battles**<br/>
Challenge friends to turn-based battles. Play each move on your own schedule and get notified when it's your turn.

</td>
</tr>
<tr>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/gamepad-2.svg?color=%237C6AE8" width="28" alt="">

**Games**<br/>
PokéPuzzle (a daily guessing challenge), the Quiz (by generation or by official category), the daily Champion Challenge and a random team generator. Journeys (`/journeys`) teach the app level by level and reward each one with a badge.

</td>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/map.svg?color=%237C6AE8" width="28" alt="">

**Gym Leaders**<br/>
Every gym leader in every game, with the exact team they use. Prepare before each badge.

</td>
</tr>
<tr>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/cloud.svg?color=%237C6AE8" width="28" alt="">

**Cloud Sync**<br/>
Teams and favorites save automatically and follow you from desktop to phone.

</td>
<td width="50%" valign="top">

<img src="https://api.iconify.design/lucide/users.svg?color=%237C6AE8" width="28" alt="">

**Community**<br/>
Share teams with a link, browse the community feed and add friends. Includes 6 themes and a daily trainer streak.

</td>
</tr>
</table>

---

## Get started

<table>
<tr>
<td align="center" width="33%">
<img src="https://api.iconify.design/lucide/mouse-pointer-click.svg?color=%237C6AE8" width="24" alt=""><br/>
<b>1. Open</b><br/>
<sub><a href="https://pokemonbuilder.app">pokemonbuilder.app</a></sub>
</td>
<td align="center" width="33%">
<img src="https://api.iconify.design/lucide/plus-circle.svg?color=%237C6AE8" width="24" alt=""><br/>
<b>2. Build</b><br/>
<sub>Add Pokémon in the Builder</sub>
</td>
<td align="center" width="33%">
<img src="https://api.iconify.design/lucide/smartphone.svg?color=%237C6AE8" width="24" alt=""><br/>
<b>3. Install</b><br/>
<sub>Optional: add it to your home screen</sub>
</td>
</tr>
</table>

---

## Built with

[![React](https://img.shields.io/badge/React_19-7C6AE8?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-7C6AE8?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-7C6AE8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Zustand](https://img.shields.io/badge/Zustand-7C6AE8?logo=react&logoColor=white)](https://github.com/pmndrs/zustand)
[![Firebase](https://img.shields.io/badge/Firebase-7C6AE8?logo=firebase&logoColor=white)](https://firebase.google.com)
[![Vercel](https://img.shields.io/badge/Vercel-7C6AE8?logo=vercel&logoColor=white)](https://vercel.com)
[![PokéAPI](https://img.shields.io/badge/PokéAPI-7C6AE8?logo=pokemon&logoColor=white)](https://pokeapi.co)

- **Client-side React SPA**, with Firebase Auth and Firestore for saved data
- **Pre-baked static data cache** built from [PokéAPI](https://pokeapi.co), so lists load instantly
- **Custom type-coverage engine**, covered by unit tests
- **Server-side battle engine** that runs `@pkmn/sim` on Vercel

---

<div align="center">
<sub>Pokémon and all related names are trademarks of Nintendo, Game Freak and The Pokémon Company. This is an unofficial fan project.</sub>
</div>
