/**
 * Local vector Pokémon illustrations + authentic PokemonBuilder Gengar Mascot rig.
 * Zero network failures in offline/sandbox mode; optional PokéAPI CDN mode in browser.
 */

const BASE_BODY_PATH = 'M-281.5 -249.5C-249.6 -238.3 -214.7 -228.6 -185.7 -216C-156.7 -203.4 -133.6 -188 -107.5 -174L-4.7 -282.5L14.8 -206.2C25.8 -214.8 37.5 -225.2 47.8 -232C58.1 -238.8 66.9 -242 76.5 -247L94.5 -166C122.7 -180.7 148.2 -196.7 179 -210C209.8 -223.3 245.8 -234 279.2 -246C275.5 -212.5 275.3 -178.2 268 -145.5C260.8 -112.8 246.5 -81.7 235.7 -49.8C244.9 -31.4 257.7 -22.2 263.2 5.5C268.7 33.2 280.6 78.6 268.5 116.2C256.4 153.8 235.8 202.2 190.8 231C145.8 259.8 62.6 288.2 -1.3 289C-65.2 289.8 -147 264.5 -192.7 235.8C-238.4 207.1 -262.8 154.6 -275.7 117C-288.6 79.4 -275.4 37.8 -270 10.5C-264.6 -16.7 -252.3 -27.5 -243.5 -46.5C-253.1 -77.7 -265.9 -106.2 -272.2 -140C-278.5 -173.8 -278.4 -213 -281.5 -249.5Z';
const CHEEK_BARBS = 'M246.7 -58.3L213.4 -81.1L211 -79.3L224.7 -41.3ZM-232.3 -38.2L-216.1 -81L-218.5 -82.8L-254.7 -54.8Z';

export function mascotSvg(mood = 'feliz', { size = 48, className = '', toneColor = '' } = {}) {
    const toneStyle = toneColor ? `style="--m-line:${toneColor}"` : '';
    let eyes = `
        <g transform="translate(-115.5 30)"><path d="M-45 14Q0 -56 45 16" fill="none" stroke="var(--m-eye)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></g>
        <g transform="translate(115.5 30) scale(-1 1)"><path d="M-45 14Q0 -56 45 16" fill="none" stroke="var(--m-eye)" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/></g>
    `;
    let mouth = `
        <path d="M-89 159Q0 93 89 159C54.5 236-54.5 236-89 159Z" fill="var(--m-mouth)"/>
        <path d="M-90.5 98L-55.5 103.5L-73.5 126.5Z" fill="var(--m-fang)" stroke="var(--m-fang-edge)" stroke-width="4" stroke-linejoin="round"/>
        <path d="M90.5 98L55.5 103.5L73.5 126.5Z" fill="var(--m-fang)" stroke="var(--m-fang-edge)" stroke-width="4" stroke-linejoin="round"/>
    `;
    let extra = `
        <g opacity="1" class="m-sparks">
            <path d="M154.8 -300.7L192 -388.9L146 -398.6L144.1 -302.9Z" fill="var(--m-line)" stroke="var(--m-line)" stroke-width="5" stroke-linejoin="round"/>
            <path d="M177.7 -275L268.2 -317.2L244.1 -350.4L176 -277.4Z" fill="var(--m-line)" stroke="var(--m-line)" stroke-width="5" stroke-linejoin="round"/>
        </g>
    `;

    if (mood === 'preocupado') {
        eyes = `
            <g transform="translate(-115.5 32)">
                <path d="M-44 -20L36 -4" fill="none" stroke="var(--m-line)" stroke-width="20" stroke-linecap="round"/>
                <circle cx="0" cy="24" r="24" fill="var(--m-eye)"/>
                <circle cx="6" cy="24" r="9" fill="var(--mascot-tile)"/>
            </g>
            <g transform="translate(115.5 32) scale(-1 1)">
                <path d="M-44 -20L36 -4" fill="none" stroke="var(--m-line)" stroke-width="20" stroke-linecap="round"/>
                <circle cx="0" cy="24" r="24" fill="var(--m-eye)"/>
                <circle cx="-6" cy="24" r="9" fill="var(--mascot-tile)"/>
            </g>
        `;
        mouth = `<path d="M-76 175Q-38 145 0 170T76 168" fill="none" stroke="var(--m-mouth)" stroke-width="22" stroke-linecap="round"/>`;
        extra = `
            <path d="M205 -250L250 -355" stroke="var(--brand-live)" stroke-width="24" stroke-linecap="round"/>
            <circle cx="192" cy="-215" r="14" fill="var(--brand-live)"/>
        `;
    } else if (mood === 'brilhando' || mood === 'radiante') {
        eyes = `
            <g transform="translate(-112 24)"><path d="M0 -34L10 -10L34 0L10 10L0 34L-10 10L-34 0L-10 -10Z" fill="var(--brand-gold)"/></g>
            <g transform="translate(112 24)"><path d="M0 -34L10 -10L34 0L10 10L0 34L-10 10L-34 0L-10 -10Z" fill="var(--brand-gold)"/></g>
        `;
        extra = `
            <g class="m-sparks">
                <path d="M168 -330L184 -395L200 -330L265 -314L200 -298L184 -233L168 -298L103 -314Z" fill="var(--brand-gold)"/>
                <path d="M-210 -295L-198 -335L-186 -295L-146 -283L-186 -271L-198 -231L-210 -271L-250 -283Z" fill="var(--brand-gold)"/>
            </g>
        `;
    } else if (mood === 'ensinando') {
        eyes = `
            <circle cx="-112" cy="30" r="36" fill="none" stroke="var(--m-eye)" stroke-width="16"/>
            <circle cx="112" cy="30" r="36" fill="none" stroke="var(--m-eye)" stroke-width="16"/>
            <path d="M-76 30L76 30" stroke="var(--m-eye)" stroke-width="14"/>
            <circle cx="-112" cy="30" r="11" fill="var(--m-eye)"/>
            <circle cx="112" cy="30" r="11" fill="var(--m-eye)"/>
        `;
        extra = `
            <path d="M-195 -270L0 -345L195 -270L0 -195Z" fill="var(--mascot-tile)" stroke="var(--m-line)" stroke-width="18" stroke-linejoin="round"/>
            <path d="M175 -264L198 -168" stroke="var(--brand-gold)" stroke-width="16" stroke-linecap="round"/>
            <circle cx="198" cy="-160" r="16" fill="var(--brand-gold)"/>
        `;
    }

    return `
    <svg class="mascot-svg ${className}" width="${size}" height="${size}" viewBox="-380 -440 760 760" aria-hidden="true" ${toneStyle}>
        <g transform="rotate(8 6 10)">
            <path d="${BASE_BODY_PATH}" fill="var(--mascot-tile)"/>
            <path d="${BASE_BODY_PATH}" fill="none" stroke="var(--m-line)" stroke-width="28" stroke-linejoin="miter" stroke-miterlimit="10"/>
            <path d="${CHEEK_BARBS}" fill="var(--m-line)"/>
            <ellipse cx="-175" cy="91" rx="31.4" ry="14.6" fill="var(--m-blush)" opacity="0.72"/>
            <ellipse cx="175" cy="91" rx="31.4" ry="14.6" fill="var(--m-blush)" opacity="0.72"/>
            ${eyes}
            ${mouth}
            ${extra}
        </g>
    </svg>`;
}

const SVG_SPRITE_LIBRARY = {
    garchomp: (shiny) => {
        const body = shiny ? '#3B4D7A' : '#2C5697';
        const belly = shiny ? '#E85346' : '#DC4A3E';
        const trim = shiny ? '#F7C948' : '#F6C23E';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 54 L6 36 L26 42 Z" fill="${body}" stroke="#121A30" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M80 54 L90 36 L70 42 Z" fill="${body}" stroke="#121A30" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M22 68 L10 82 L32 76 Z" fill="${body}" stroke="#121A30" stroke-width="2.5"/>
            <path d="M74 68 L86 82 L64 76 Z" fill="${body}" stroke="#121A30" stroke-width="2.5"/>
            <path d="M28 40 C26 24 38 14 48 14 C58 14 70 24 68 40 L72 72 C72 82 58 88 48 88 C38 88 24 82 24 72 Z" fill="${body}" stroke="#121A30" stroke-width="3"/>
            <path d="M12 24 L30 22 L28 32 L14 30 Z" fill="${body}" stroke="#121A30" stroke-width="2.5"/>
            <path d="M84 24 L66 22 L68 32 L82 30 Z" fill="${body}" stroke="#121A30" stroke-width="2.5"/>
            <circle cx="14" cy="27" r="3" fill="${trim}"/>
            <circle cx="82" cy="27" r="3" fill="${trim}"/>
            <path d="M36 42 L60 42 L62 72 C56 79 40 79 34 72 Z" fill="${belly}"/>
            <polygon points="48,46 53,55 48,64 43,55" fill="${trim}"/>
            <path d="M48 16 L51 24 L45 24 Z" fill="${trim}"/>
            <path d="M31 32 L40 27 L41 35 Z" fill="#F8FAFC"/>
            <path d="M65 32 L56 27 L55 35 Z" fill="#F8FAFC"/>
            <circle cx="38" cy="31" r="2.2" fill="#121A30"/>
            <circle cx="58" cy="31" r="2.2" fill="#121A30"/>
            <path d="M38 38 L44 40 L48 37 L52 40 L58 38" fill="none" stroke="#F8FAFC" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    },
    heatran: (shiny) => {
        const shell = shiny ? '#C84F32' : '#9B4837';
        const visor = shiny ? '#CBD5E1' : '#94A3B8';
        const magma = shiny ? '#FF8A3D' : '#F97316';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="48" cy="54" rx="32" ry="26" fill="${shell}" stroke="#1E1414" stroke-width="3"/>
            <circle cx="28" cy="48" r="5" fill="${magma}"/>
            <circle cx="68" cy="48" r="5" fill="${magma}"/>
            <circle cx="36" cy="68" r="4" fill="${magma}"/>
            <circle cx="60" cy="68" r="4" fill="${magma}"/>
            <path d="M28 34 L68 34 L72 50 L58 58 L38 58 L24 50 Z" fill="${visor}" stroke="#1E1414" stroke-width="2.5" stroke-linejoin="round"/>
            <rect x="33" y="40" width="9" height="7" rx="2" fill="#EF4444"/>
            <rect x="54" y="40" width="9" height="7" rx="2" fill="#EF4444"/>
            <circle cx="37.5" cy="43.5" r="2" fill="#FEF08A"/>
            <circle cx="58.5" cy="43.5" r="2" fill="#FEF08A"/>
            <path d="M38 52 H58" stroke="#1E1414" stroke-width="3"/>
            <rect x="16" y="70" width="14" height="12" rx="4" fill="${visor}" stroke="#1E1414" stroke-width="2.5"/>
            <rect x="66" y="70" width="14" height="12" rx="4" fill="${visor}" stroke="#1E1414" stroke-width="2.5"/>
        </svg>`;
    },
    incineroar: (shiny) => {
        const coat = shiny ? '#F1F5F9' : '#D93829';
        const dark = '#1F242D';
        const flame = '#FF7A1A';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 28 L34 14 L42 28 Z" fill="${coat}" stroke="#111318" stroke-width="2.5"/>
            <path d="M74 28 L62 14 L54 28 Z" fill="${coat}" stroke="#111318" stroke-width="2.5"/>
            <path d="M22 48 C18 32 32 22 48 22 C64 22 78 32 74 48 L70 82 L26 82 Z" fill="${dark}" stroke="#111318" stroke-width="3"/>
            <path d="M26 28 C34 22 62 22 70 28 C66 44 30 44 26 28 Z" fill="${coat}"/>
            <path d="M20 40 L34 40 M62 40 L76 40" stroke="${coat}" stroke-width="6" stroke-linecap="round"/>
            <path d="M28 58 L68 58 L65 72 L31 72 Z" fill="${flame}" stroke="#111318" stroke-width="2"/>
            <circle cx="48" cy="65" r="5" fill="#FACC15"/>
            <polygon points="35,34 44,37 37,40" fill="#84CC16"/>
            <polygon points="61,34 52,37 59,40" fill="#84CC16"/>
            <polygon points="45,42 51,42 48,46" fill="#EF4444"/>
            <path d="M36 47 L48 52 L60 47" fill="none" stroke="#F8FAFC" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`;
    },
    rillaboom: (shiny) => {
        const leaf = shiny ? '#84CC16' : '#3E9B4F';
        const fur = '#5E4638';
        const wood = '#8A5A36';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="36" r="26" fill="${leaf}" stroke="#17301C" stroke-width="3"/>
            <circle cx="30" cy="24" r="10" fill="${leaf}"/>
            <circle cx="66" cy="24" r="10" fill="${leaf}"/>
            <ellipse cx="48" cy="48" rx="18" ry="15" fill="${fur}" stroke="#17301C" stroke-width="2.5"/>
            <ellipse cx="48" cy="52" rx="13" ry="9" fill="#D4A373"/>
            <circle cx="42" cy="44" r="2.6" fill="#EF4444"/>
            <circle cx="54" cy="44" r="2.6" fill="#EF4444"/>
            <path d="M42 55 H54" stroke="#17301C" stroke-width="2.5" stroke-linecap="round"/>
            <ellipse cx="48" cy="76" rx="22" ry="12" fill="${wood}" stroke="#2D1D11" stroke-width="2.5"/>
            <ellipse cx="48" cy="70" rx="20" ry="7" fill="#E9D8A6" stroke="#2D1D11" stroke-width="2"/>
            <path d="M24 58 L38 72 M72 58 L58 72" stroke="#D97706" stroke-width="4" stroke-linecap="round"/>
        </svg>`;
    },
    'rotom-wash': (shiny) => {
        const body = shiny ? '#EF4444' : '#F97316';
        const aura = shiny ? '#EC4899' : '#38BDF8';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 42 Q8 22 24 22 L28 38 Z" fill="${aura}" stroke="#0F2A44" stroke-width="2.5" stroke-linejoin="round"/>
            <path d="M80 42 Q88 22 72 22 L68 38 Z" fill="${aura}" stroke="#0F2A44" stroke-width="2.5" stroke-linejoin="round"/>
            <rect x="24" y="22" width="48" height="58" rx="12" fill="${body}" stroke="#1E1B4B" stroke-width="3"/>
            <rect x="24" y="22" width="48" height="14" rx="8" fill="#E2E8F0" stroke="#1E1B4B" stroke-width="2.5"/>
            <circle cx="38" cy="44" r="4.5" fill="#7DD3FC" stroke="#1E1B4B" stroke-width="1.5"/>
            <circle cx="58" cy="44" r="4.5" fill="#7DD3FC" stroke="#1E1B4B" stroke-width="1.5"/>
            <circle cx="48" cy="60" r="14" fill="#38BDF8" stroke="#E2E8F0" stroke-width="3.5"/>
            <path d="M40 58 Q48 51 56 58" fill="none" stroke="#F8FAFC" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M48 12 L42 22 H54 Z" fill="${body}" stroke="#1E1B4B" stroke-width="2"/>
        </svg>`;
    },
    'flutter-mane': (shiny) => {
        const cloak = shiny ? '#A3E635' : '#4C6B74';
        const tips = shiny ? '#FDE047' : '#EC4899';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 48 C18 22 36 14 48 14 C60 14 78 22 82 48 L88 74 L68 68 L58 84 L48 70 L38 84 L28 68 L8 74 Z" fill="${cloak}" stroke="#1E1B2E" stroke-width="3" stroke-linejoin="round"/>
            <path d="M12 72 L24 64 L36 80 M60 80 L72 64 L84 72" fill="none" stroke="${tips}" stroke-width="4" stroke-linecap="round"/>
            <circle cx="48" cy="42" r="18" fill="${cloak}"/>
            <path d="M36 42 L43 38 L43 46 Z" fill="#FDE047"/>
            <path d="M60 42 L53 38 L53 46 Z" fill="#FDE047"/>
            <circle cx="38" cy="58" r="4" fill="#F43F5E"/>
            <circle cx="48" cy="60" r="4.5" fill="#F43F5E"/>
            <circle cx="58" cy="58" r="4" fill="#F43F5E"/>
        </svg>`;
    },
    gengar: (shiny) => {
        const fill = shiny ? '#5E547A' : '#634A8C';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 24 L36 32 L44 18 L52 30 L60 18 L66 32 L78 24 L74 44 C82 54 80 74 64 82 L58 86 L48 80 L38 86 L32 82 C16 74 14 54 22 44 Z" fill="${fill}" stroke="#1B0A3D" stroke-width="3" stroke-linejoin="round"/>
            <polygon points="30,42 44,48 33,52" fill="#FF3D9A"/>
            <polygon points="66,42 52,48 63,52" fill="#FF3D9A"/>
            <path d="M31 60 Q48 54 65 60 C60 74 36 74 31 60 Z" fill="#F8FAFC" stroke="#1B0A3D" stroke-width="2"/>
            <path d="M41 58 V69 M48 57 V70 M55 58 V69" stroke="#1B0A3D" stroke-width="2"/>
        </svg>`;
    },
    gastly: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="32" fill="#A855F7" opacity="0.28"/>
            <circle cx="30" cy="28" r="14" fill="#9333EA" opacity="0.32"/>
            <circle cx="68" cy="34" r="12" fill="#9333EA" opacity="0.28"/>
            <circle cx="48" cy="50" r="22" fill="#27193B" stroke="#1B0A3D" stroke-width="3"/>
            <path d="M35 42 A6 7 0 1 0 47 46 Z" fill="#F8FAFC"/>
            <path d="M61 42 A6 7 0 1 1 49 46 Z" fill="#F8FAFC"/>
            <circle cx="41" cy="44" r="2" fill="#1B0A3D"/>
            <circle cx="55" cy="44" r="2" fill="#1B0A3D"/>
            <path d="M38 58 Q48 66 58 58" fill="#F43F5E" stroke="#1B0A3D" stroke-width="2"/>
            <polygon points="40,58 43,63 45,58" fill="#F8FAFC"/>
            <polygon points="56,58 53,63 51,58" fill="#F8FAFC"/>
        </svg>`,
    haunter: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 28 L38 34 L48 16 L58 34 L76 28 L66 52 L74 66 L54 64 L48 80 L42 64 L22 66 L30 52 Z" fill="#6D4C9E" stroke="#1B0A3D" stroke-width="3" stroke-linejoin="round"/>
            <polygon points="32,42 45,47 34,51" fill="#FDE047"/>
            <polygon points="64,42 51,47 62,51" fill="#FDE047"/>
            <path d="M36 58 L42 64 L48 58 L54 64 L60 58" fill="none" stroke="#FB7185" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M12 68 L22 62 L24 74 Z M84 68 L74 62 L72 74 Z" fill="#6D4C9E" stroke="#1B0A3D" stroke-width="2"/>
        </svg>`,
    raichu: (shiny) => {
        const fur = shiny ? '#EA580C' : '#F59E0B';
        const belly = '#FEF3C7';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 30 Q14 14 28 18 L36 30 Z" fill="#78350F" stroke="#451A03" stroke-width="2.5"/>
            <path d="M74 30 Q82 14 68 18 L60 30 Z" fill="#78350F" stroke="#451A03" stroke-width="2.5"/>
            <path d="M70 72 Q88 64 84 36 L74 42 L84 22 L92 34" fill="none" stroke="#451A03" stroke-width="4" stroke-linecap="round"/>
            <polygon points="82,16 92,28 76,30" fill="#FACC15" stroke="#451A03" stroke-width="2"/>
            <ellipse cx="48" cy="56" rx="22" ry="26" fill="${fur}" stroke="#451A03" stroke-width="3"/>
            <ellipse cx="48" cy="64" rx="13" ry="15" fill="${belly}"/>
            <circle cx="34" cy="45" r="5" fill="#FACC15"/>
            <circle cx="62" cy="45" r="5" fill="#FACC15"/>
            <circle cx="40" cy="39" r="3" fill="#1E1B4B"/>
            <circle cx="56" cy="39" r="3" fill="#1E1B4B"/>
            <path d="M44 46 Q48 49 52 46" fill="none" stroke="#451A03" stroke-width="2.2" stroke-linecap="round"/>
        </svg>`;
    },
    charmander: (shiny) => {
        const body = shiny ? '#F59E0B' : '#F97316';
        const belly = '#FEF3C7';
        return `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M72 52 Q86 38 78 24 Q72 34 68 38 Q70 28 65 20 Q60 32 62 46 Z" fill="#FACC15" stroke="#B91C1C" stroke-width="2"/>
            <path d="M56 72 Q74 72 72 52" fill="none" stroke="${body}" stroke-width="9" stroke-linecap="round"/>
            <path d="M56 72 Q74 72 72 52" fill="none" stroke="#1E1B4B" stroke-width="2" stroke-linecap="round"/>
            <ellipse cx="44" cy="58" rx="18" ry="22" fill="${body}" stroke="#1E1B4B" stroke-width="3"/>
            <ellipse cx="42" cy="62" rx="11" ry="15" fill="${belly}"/>
            <circle cx="44" cy="34" r="15" fill="${body}" stroke="#1E1B4B" stroke-width="3"/>
            <ellipse cx="38" cy="33" rx="2.6" ry="4" fill="#0F172A"/>
            <circle cx="37.2" cy="31.5" r="1" fill="#FFFFFF"/>
            <path d="M32 42 Q40 46 49 41" fill="none" stroke="#1E1B4B" stroke-width="2" stroke-linecap="round"/>
            <path d="M27 54 L19 59 M58 54 L66 58" stroke="${body}" stroke-width="6" stroke-linecap="round"/>
            <ellipse cx="36" cy="80" rx="7" ry="4" fill="${body}" stroke="#1E1B4B" stroke-width="2.5"/>
            <ellipse cx="52" cy="80" rx="7" ry="4" fill="${body}" stroke="#1E1B4B" stroke-width="2.5"/>
        </svg>`;
    },
    pelipper: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 46 Q26 24 42 42 Z M84 46 Q70 24 54 42 Z" fill="#3B82F6" stroke="#1E3A8A" stroke-width="2.5"/>
            <ellipse cx="48" cy="52" rx="22" ry="24" fill="#F8FAFC" stroke="#1E3A8A" stroke-width="3"/>
            <path d="M30 48 Q48 80 66 48 Z" fill="#FACC15" stroke="#854D0E" stroke-width="2.5"/>
            <circle cx="40" cy="38" r="2.8" fill="#1E293B"/>
            <circle cx="56" cy="38" r="2.8" fill="#1E293B"/>
            <path d="M42 26 L48 16 L54 26" fill="#3B82F6"/>
        </svg>`,
    baxcalibur: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <polygon points="48,10 62,38 34,38" fill="#7DD3FC" stroke="#1E293B" stroke-width="2.5"/>
            <path d="M24 44 L48 26 L72 44 L68 82 L28 82 Z" fill="#475569" stroke="#1E293B" stroke-width="3"/>
            <path d="M36 52 H60 L56 76 H40 Z" fill="#94A3B8"/>
            <rect x="34" y="40" width="8" height="5" fill="#FACC15"/>
            <rect x="54" y="40" width="8" height="5" fill="#FACC15"/>
        </svg>`,
    volcarona: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="26" cy="40" rx="18" ry="22" fill="#F97316" stroke="#431407" stroke-width="2.5"/>
            <ellipse cx="70" cy="40" rx="18" ry="22" fill="#F97316" stroke="#431407" stroke-width="2.5"/>
            <circle cx="24" cy="36" r="6" fill="#1E293B"/>
            <circle cx="72" cy="36" r="6" fill="#1E293B"/>
            <ellipse cx="48" cy="54" rx="14" ry="22" fill="#F8FAFC" stroke="#431407" stroke-width="2.5"/>
            <circle cx="43" cy="40" r="3" fill="#38BDF8"/>
            <circle cx="53" cy="40" r="3" fill="#38BDF8"/>
        </svg>`,
    milotic: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 76 Q32 48 46 42 Q56 36 52 20" fill="none" stroke="#FDE68A" stroke-width="14" stroke-linecap="round"/>
            <circle cx="52" cy="24" r="10" fill="#FDE68A" stroke="#713F12" stroke-width="2"/>
            <path d="M58 22 L76 16 M58 26 L74 30" stroke="#F43F5E" stroke-width="3.5" stroke-linecap="round"/>
            <path d="M16 74 L30 68 L28 84 Z" fill="#60A5FA" stroke="#1E3A8A" stroke-width="2"/>
            <circle cx="49" cy="23" r="2.2" fill="#EF4444"/>
        </svg>`,
    aerodactyl: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 44 L36 38 L30 60 Z M88 44 L60 38 L66 60 Z" fill="#94A3B8" stroke="#1E293B" stroke-width="2.5"/>
            <ellipse cx="48" cy="52" rx="14" ry="22" fill="#A8A29E" stroke="#1E293B" stroke-width="2.5"/>
            <path d="M36 30 L48 16 L60 30 L52 44 H44 Z" fill="#A8A29E" stroke="#1E293B" stroke-width="2.5"/>
            <circle cx="43" cy="30" r="2.5" fill="#FACC15"/>
            <circle cx="53" cy="30" r="2.5" fill="#FACC15"/>
        </svg>`,
    charizard: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 42 L34 32 L30 58 Z M86 42 L62 32 L66 58 Z" fill="#0F766E" stroke="#431407" stroke-width="2.5"/>
            <ellipse cx="48" cy="54" rx="18" ry="24" fill="#F97316" stroke="#431407" stroke-width="3"/>
            <ellipse cx="48" cy="60" rx="11" ry="15" fill="#FEF08A"/>
            <path d="M38 24 L42 12 M58 24 L54 12" stroke="#F97316" stroke-width="4" stroke-linecap="round"/>
            <circle cx="42" cy="34" r="2.6" fill="#0F172A"/>
            <circle cx="54" cy="34" r="2.6" fill="#0F172A"/>
        </svg>`,
    farigiraf: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="48" cy="40" rx="22" ry="22" fill="#581C87" stroke="#1E1B4B" stroke-width="3"/>
            <circle cx="48" cy="44" r="14" fill="#FBBF24"/>
            <circle cx="42" cy="42" r="2.8" fill="#1E1B4B"/>
            <circle cx="54" cy="42" r="2.8" fill="#1E1B4B"/>
            <rect x="34" y="60" width="28" height="20" rx="8" fill="#92400E" stroke="#1E1B4B" stroke-width="2.5"/>
        </svg>`,
    kingambit: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 26 Q48 10 76 26 L62 34 H34 Z" fill="#FACC15" stroke="#18181B" stroke-width="2.5"/>
            <path d="M26 36 H70 L66 80 H30 Z" fill="#DC2626" stroke="#18181B" stroke-width="3"/>
            <path d="M20 62 L48 54 L76 62" fill="none" stroke="#E2E8F0" stroke-width="5" stroke-linecap="round"/>
            <circle cx="41" cy="44" r="2.6" fill="#FEF08A"/>
            <circle cx="55" cy="44" r="2.6" fill="#FEF08A"/>
        </svg>`,
    sylveon: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 36 L22 14 L40 28 Z M68 36 L74 14 L56 28 Z" fill="#F472B6" stroke="#500724" stroke-width="2.5"/>
            <ellipse cx="48" cy="54" rx="19" ry="22" fill="#FDF2F8" stroke="#500724" stroke-width="2.5"/>
            <circle cx="48" cy="60" r="6" fill="#F472B6"/>
            <circle cx="41" cy="44" r="3" fill="#38BDF8"/>
            <circle cx="55" cy="44" r="3" fill="#38BDF8"/>
        </svg>`,
    staraptor: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M40 24 Q52 8 64 26 L52 34 Z" fill="#EF4444" stroke="#18181B" stroke-width="2"/>
            <ellipse cx="48" cy="54" rx="20" ry="24" fill="#52525B" stroke="#18181B" stroke-width="3"/>
            <ellipse cx="48" cy="58" rx="11" ry="14" fill="#F4F4F5"/>
            <polygon points="44,42 52,42 48,50" fill="#FACC15"/>
        </svg>`,
    floette: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="36" r="20" fill="#F472B6" stroke="#4C0519" stroke-width="2.5"/>
            <circle cx="48" cy="40" r="10" fill="#F8FAFC"/>
            <path d="M48 50 V82" stroke="#16A34A" stroke-width="4" stroke-linecap="round"/>
            <circle cx="44" cy="39" r="2" fill="#1E293B"/>
            <circle cx="52" cy="39" r="2" fill="#1E293B"/>
        </svg>`,
    basculegion: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="48" cy="52" rx="28" ry="18" fill="#1E3A5F" stroke="#0F172A" stroke-width="3"/>
            <path d="M36 42 Q52 46 66 42 L70 58 Q50 64 36 58 Z" fill="#EC4899"/>
            <circle cx="32" cy="48" r="4" fill="#FACC15"/>
        </svg>`,
    whimsicott: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="48" r="26" fill="#F8FAFC" stroke="#1E293B" stroke-width="3"/>
            <circle cx="28" cy="32" r="11" fill="#F8FAFC"/>
            <circle cx="68" cy="32" r="11" fill="#F8FAFC"/>
            <circle cx="48" cy="52" r="14" fill="#854D0E"/>
            <circle cx="42" cy="50" r="2.5" fill="#F97316"/>
            <circle cx="54" cy="50" r="2.5" fill="#F97316"/>
        </svg>`,
    sneasler: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <path d="M38 14 L48 34 L30 30 Z" fill="#D946EF" stroke="#1E1B4B" stroke-width="2.5"/>
            <ellipse cx="48" cy="54" rx="18" ry="24" fill="#334155" stroke="#1E1B4B" stroke-width="3"/>
            <circle cx="42" cy="42" r="2.8" fill="#EF4444"/>
            <circle cx="54" cy="42" r="2.8" fill="#EF4444"/>
            <path d="M22 58 L34 52 M74 58 L62 52" stroke="#F8FAFC" stroke-width="4" stroke-linecap="round"/>
        </svg>`,
    gholdengo: () => `
        <svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
            <rect x="34" y="20" width="28" height="58" rx="14" fill="#FACC15" stroke="#713F12" stroke-width="3"/>
            <path d="M34 36 H62 M34 50 H62 M34 64 H62" stroke="#B45309" stroke-width="2"/>
            <circle cx="42" cy="29" r="3" fill="#0F172A"/>
            <circle cx="54" cy="29" r="3" fill="#0F172A"/>
            <ellipse cx="48" cy="80" rx="28" ry="6" fill="#EAB308" stroke="#713F12" stroke-width="2"/>
        </svg>`,
};

export function spriteDataUri(spriteKey, { shiny = false } = {}) {
    const fn = SVG_SPRITE_LIBRARY[spriteKey] || SVG_SPRITE_LIBRARY.gengar;
    const svg = fn(shiny).trim();
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getPokemonImageSrc(mon, { mode = 'vector', artwork = false, shiny = false } = {}) {
    const fallback = spriteDataUri(mon.spriteKey || 'gengar', { shiny });
    if (mode === 'pokeapi' && mon.id) {
        const sub = artwork ? 'other/official-artwork/' : '';
        const sh = shiny ? 'shiny/' : '';
        return {
            src: `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${sub}${sh}${mon.id}.png`,
            fallback,
        };
    }
    return { src: fallback, fallback };
}

export function renderPokemonImg(mon, { className = '', alt = '', mode = 'vector', artwork = false, shiny = false, size = 64 } = {}) {
    const { src, fallback } = getPokemonImageSrc(mon, { mode, artwork, shiny });
    return `<img class="${className}" src="${src}" alt="${alt || mon.name}" width="${size}" height="${size}" loading="eager" onerror="if(this.dataset.fb!== '1'){this.dataset.fb='1';this.src='${fallback}'}" />`;
}
