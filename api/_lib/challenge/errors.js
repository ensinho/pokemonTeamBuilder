import { HttpError } from '../httpBasics.js';

/**
 * An API error with a stable code the client switches on (and translates):
 * `res.status(status).json({error: code, ...extra})`. Dependency-free apart
 * from `httpBasics.js`, so the endpoint can import it statically.
 */
export class ChallengeError extends HttpError {
    constructor(status, code, extra = {}) {
        super(status, code);
        this.code = code;
        this.extra = extra;
    }
}

export const fail = (status, code, extra) => new ChallengeError(status, code, extra);
