/**
 * The bot's lazy chunk (2026-11-11): the open-bot-avatar engine (vendored),
 * the bot's frame and its controller. Loaded only where a bot is drawn
 * (`useMascotBot`), after the line mascot's own chunk.
 */
export { BotStage } from './botStage.js';
export { botMotion, botState, botVolume, botStill } from '../../utils/mascot/bot/frame.js';
export { BOT_STATES } from '../../utils/mascot/bot/state.js';
