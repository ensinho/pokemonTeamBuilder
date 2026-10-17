import { useBattleDex } from './useBattleDex';
import { useBattleItems } from './useBattleItems';

/** What a Champion Challenge team sheet is built from: the moves/species dex and the held items, each loaded once. */
export const useSheetSources = () => ({ dex: useBattleDex(), items: useBattleItems() });
