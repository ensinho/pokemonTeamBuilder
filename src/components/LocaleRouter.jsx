import React, { startTransition, useLayoutEffect, useState } from 'react';
import { Router } from 'react-router-dom';
import { deployBase, getLocaleHistory, mirrorLanguageInUrl } from '../services/localeHistory';
import { routerBasename, splitLocalePath } from '../utils/localePath';
import { useLanguageStore } from '../store/useLanguageStore';

/**
 * BrowserRouter, with the language prefix folded into the basename.
 *
 * The basename is derived from the *same* location object the router renders,
 * in the same state update, so `/pt/builder` and `/builder` are both the app
 * path `/builder` at every instant — switching language changes the URL and
 * nothing else: no route remounts, no store resets. (A basename passed as a
 * separate prop would spend one render out of step with the location, and in
 * that render the router matches nothing and unmounts the whole app.)
 *
 * The language store is the authority after boot; the URL mirrors it. A Back
 * into an entry recorded under the other language is rewritten to match,
 * rather than silently flipping the visitor's language.
 */
export function LocaleRouter({ children }) {
    const history = getLocaleHistory();
    const [state, setState] = useState(() => ({ action: history.action, location: history.location }));

    useLayoutEffect(() => history.listen((update) => {
        startTransition(() => setState({ action: update.action, location: update.location }));
    }), [history]);

    useLayoutEffect(() => {
        const urlLanguage = splitLocalePath(state.location.pathname, deployBase()).language;
        const language = useLanguageStore.getState().language;
        if (urlLanguage !== language) mirrorLanguageInUrl(language);
    }, [state.location]);

    return (
        <Router
            basename={routerBasename(state.location.pathname, deployBase())}
            location={state.location}
            navigationType={state.action}
            navigator={history}
        >
            {children}
        </Router>
    );
}
