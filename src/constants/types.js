import NormalIcon from '../assets/typeIcons/Normal_icon_LA.png';
import FireIcon from '../assets/typeIcons/Fire_icon_LA.png';
import WaterIcon from '../assets/typeIcons/Water_icon_LA.png';
import ElectricIcon from '../assets/typeIcons/Electric_icon_LA.png';
import GrassIcon from '../assets/typeIcons/Grass_icon_LA.png';
import IceIcon from '../assets/typeIcons/Ice_icon_LA.png';
import FightingIcon from '../assets/typeIcons/Fighting_icon_LA.png';
import PoisonIcon from '../assets/typeIcons/Poison_icon_LA.png';
import GroundIcon from '../assets/typeIcons/Ground_icon_LA.png';
import FlyingIcon from '../assets/typeIcons/Flying_icon_LA.png';
import PsychicIcon from '../assets/typeIcons/Psychic_icon_LA.png';
import BugIcon from '../assets/typeIcons/Bug_icon_LA.png';
import RockIcon from '../assets/typeIcons/Rock_icon_LA.png';
import GhostIcon from '../assets/typeIcons/Ghost_icon_LA.png';
import DragonIcon from '../assets/typeIcons/Dragon_icon_LA.png';
import DarkIcon from '../assets/typeIcons/Dark_icon_LA.png';
import SteelIcon from '../assets/typeIcons/Steel_icon_LA.png';
import FairyIcon from '../assets/typeIcons/Fairy_icon_LA.png';

export const typeColors = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
    steel: '#B7B7CE', fairy: '#D685AD',
};

export const typeIcons = {
    normal: NormalIcon, fire: FireIcon, water: WaterIcon, electric: ElectricIcon,
    grass: GrassIcon, ice: IceIcon, fighting: FightingIcon, poison: PoisonIcon,
    ground: GroundIcon, flying: FlyingIcon, psychic: PsychicIcon, bug: BugIcon,
    rock: RockIcon, ghost: GhostIcon, dragon: DragonIcon, dark: DarkIcon,
    steel: SteelIcon, fairy: FairyIcon,
};

export const typeChart = {
    normal: { damageTaken: { Fighting: 2, Ghost: 0 }, damageDealt: { Rock: 0.5, Steel: 0.5 } },
    fire: { damageTaken: { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Rock: 0.5, Dragon: 0.5, Grass: 2, Ice: 2, Bug: 2, Steel: 2 } },
    water: { damageTaken: { Grass: 2, Electric: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 }, damageDealt: { Water: 0.5, Grass: 0.5, Dragon: 0.5, Fire: 2, Ground: 2, Rock: 2 } },
    grass: { damageTaken: { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Grass: 0.5, Electric: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Grass: 0.5, Poison: 0.5, Flying: 0.5, Bug: 0.5, Steel: 0.5, Dragon: 0.5, Water: 2, Ground: 2, Rock: 2 } },
    electric: { damageTaken: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 }, damageDealt: { Grass: 0.5, Electric: 0.5, Dragon: 0.5, Ground: 0, Water: 2, Flying: 2 } },
    ice: { damageTaken: { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 }, damageDealt: { Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5, Grass: 2, Ground: 2, Flying: 2, Dragon: 2 } },
    fighting: { damageTaken: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 }, damageDealt: { Flying: 0.5, Psychic: 0.5, Bug: 0.5, Fairy: 0.5, Poison: 0.5, Ghost: 0, Normal: 2, Ice: 2, Rock: 2, Dark: 2, Steel: 2 } },
    poison: { damageTaken: { Ground: 2, Psychic: 2, Grass: 0.5, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Fairy: 0.5 }, damageDealt: { Ground: 0.5, Rock: 0.5, Poison: 0.5, Ghost: 0.5, Steel: 0, Grass: 2, Fairy: 2 } },
    ground: { damageTaken: { Water: 2, Grass: 2, Ice: 2, Poison: 0.5, Rock: 0.5, Electric: 0 }, damageDealt: { Grass: 0.5, Bug: 0.5, Flying: 0, Fire: 2, Electric: 2, Poison: 2, Rock: 2, Steel: 2 } },
    flying: { damageTaken: { Electric: 2, Ice: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Bug: 0.5, Ground: 0 }, damageDealt: { Electric: 0.5, Rock: 0.5, Steel: 0.5, Grass: 2, Fighting: 2, Bug: 2 } },
    psychic: { damageTaken: { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 }, damageDealt: { Steel: 0.5, Psychic: 0.5, Dark: 0, Fighting: 2, Poison: 2 } },
    bug: { damageTaken: { Fire: 2, Flying: 2, Rock: 2, Grass: 0.5, Fighting: 0.5, Ground: 0.5 }, damageDealt: { Fire: 0.5, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Ghost: 0.5, Steel: 0.5, Fairy: 0.5, Grass: 2, Psychic: 2, Dark: 2 } },
    rock: { damageTaken: { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Steel: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 }, damageDealt: { Fighting: 0.5, Ground: 0.5, Steel: 0.5, Fire: 2, Ice: 2, Flying: 2, Bug: 2 } },
    ghost: { damageTaken: { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 }, damageDealt: { Steel: 0.5, Dark: 0.5, Normal: 0, Ghost: 2, Psychic: 2 } },
    dragon: { damageTaken: { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Grass: 0.5, Electric: 0.5 }, damageDealt: { Steel: 0.5, Fairy: 0, Dragon: 2 } },
    dark: { damageTaken: { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 }, damageDealt: { Fighting: 0.5, Dark: 0.5, Fairy: 0.5, Ghost: 2, Psychic: 2 } },
    steel: { damageTaken: { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Steel: 0.5, Fairy: 0.5, Poison: 0 }, damageDealt: { Fire: 0.5, Water: 0.5, Electric: 0.5, Steel: 0.5, Ice: 2, Rock: 2, Fairy: 2 } },
    fairy: { damageTaken: { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }, damageDealt: { Fire: 0.5, Poison: 0.5, Steel: 0.5, Fighting: 2, Dragon: 2, Dark: 2 } },
};
