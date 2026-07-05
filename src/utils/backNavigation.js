// Label for a dynamic back button given the URL the user navigated from
// (stashed in location.state.from). Falls back to the caller's default when
// the origin is unknown (deep link / external referrer).
export function backLabelFor(fromPath = '', pt = false, fallback = '') {
    if (fromPath.startsWith('/pokemon/')) return pt ? 'Voltar ao Pokémon' : 'Back to Pokémon';
    if (fromPath.startsWith('/pokedex')) return pt ? 'Voltar à Pokédex' : 'Back to Pokédex';
    if (fromPath.startsWith('/moves/')) return pt ? 'Voltar ao movimento' : 'Back to move';
    if (fromPath.startsWith('/moves')) return pt ? 'Todos os movimentos' : 'All moves';
    if (fromPath.startsWith('/abilities/')) return pt ? 'Voltar à habilidade' : 'Back to ability';
    if (fromPath.startsWith('/abilities')) return pt ? 'Todas as habilidades' : 'All abilities';
    if (fromPath.startsWith('/items/')) return pt ? 'Voltar ao item' : 'Back to item';
    if (fromPath.startsWith('/items')) return pt ? 'Todos os itens' : 'All items';
    if (fromPath.startsWith('/meta')) return pt ? 'Voltar ao Meta & Uso' : 'Back to Meta & Usage';
    if (fromPath.startsWith('/tournaments/team')) return pt ? 'Voltar ao time' : 'Back to team';
    if (fromPath.startsWith('/tournaments')) return pt ? 'Voltar aos torneios' : 'Back to tournaments';
    if (fromPath.startsWith('/teams')) return pt ? 'Voltar ao time' : 'Back to team';
    if (fromPath.startsWith('/builder')) return pt ? 'Voltar ao construtor' : 'Back to builder';
    if (fromPath.startsWith('/favorites')) return pt ? 'Voltar aos favoritos' : 'Back to favorites';
    if (fromPath.startsWith('/damage-calculator')) return pt ? 'Voltar à calculadora' : 'Back to calculator';
    if (fromPath.startsWith('/gyms')) return pt ? 'Voltar aos ginásios' : 'Back to gyms';
    if (fromPath === '/' || fromPath.startsWith('/home')) return pt ? 'Voltar ao início' : 'Back to home';
    if (fromPath) return pt ? 'Voltar' : 'Back';
    return fallback || (pt ? 'Voltar' : 'Back');
}
