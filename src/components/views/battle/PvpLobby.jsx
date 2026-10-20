import { Link } from 'react-router-dom';

import { useTranslation } from '../../../hooks/useTranslation';
import { getPokemonFrontSpriteUrl } from '../../../utils/pokemonSprites';
import { DsTeamPicker } from '../challenge/ds/DsTeamPicker';

/** A locked-in team, as a row of sprites. */
function TeamRow({ team }) {
    if (!team?.sprites?.length) return null;
    return (
        <div className="pvp-lobby__team">
            <span className="pvp-lobby__team-name">{team.teamName}</span>
            <span className="pvp-lobby__team-sprites" aria-hidden="true">
                {team.sprites.slice(0, 6).map((mon, index) => (
                    // A locked team keeps its order.
                    <img key={`${mon.id}-${index}`} src={getPokemonFrontSpriteUrl(mon.id)} alt="" width={32} height={32} loading="lazy" decoding="async" draggable="false" />
                ))}
            </span>
        </div>
    );
}

function Panel({ title, body, children, actions, inputRef, onA, onB }) {
    if (inputRef) {
        inputRef.current = {
            onAction: (action) => {
                if (action === 'a') onA?.();
                else if (action === 'b') onB?.();
            },
        };
    }
    return (
        <div className="ds-panel pvp-lobby">
            <p className="ds-panel__title">{title}</p>
            {body && <p className="ds-panel__body">{body}</p>}
            {children}
            <div className={`ds-panel__actions ${actions.length > 2 ? 'is-three' : ''}`}>{actions}</div>
        </div>
    );
}

/**
 * Everything before the first move, on the console's screen — one decision
 * per state, never a form:
 *
 *   challenged  →  pick a team (the one used last is chosen) → LUTAR!  (one tap
 *                  when that team is the one you want; the battle starts there)
 *   challenger  →  the challenge is out with your team; nothing to wait for here
 *   team select →  only for a challenge sent without a team (older clients)
 *   random      →  the deal, under way
 *   declined / cancelled / open invite
 */
export function PvpLobby({
    view, opponentName, savedTeams, preferredTeamId, myTeam, isBusy, inputRef,
    onAccept, onDecline, onCancel, onSubmitTeam, onRoll, onRematch, onBack,
}) {
    const { t } = useTranslation();
    const name = opponentName;
    const back = <button key="back" type="button" className="bw-cancel" onClick={onBack}>{t('challenge.command.back')}</button>;
    const decline = (
        <button type="button" className="ds-link" onClick={onDecline} disabled={isBusy}>{t('battle.lobby.decline')}</button>
    );

    const pickTeam = (onStart, title) => (
        savedTeams.length === 0 ? (
            <Panel
                title={title}
                body={t('battle.lobby.noTeams')}
                inputRef={inputRef}
                onB={onBack}
                actions={[
                    <Link key="build" className="ds-go" to="/builder">{t('battle.lobby.buildTeam')}</Link>,
                    view.canDecline
                        ? <button key="decline" type="button" className="ds-cmd is-plain" onClick={onDecline}>{t('battle.lobby.decline')}</button>
                        : back,
                ]}
            />
        ) : (
            <DsTeamPicker
                savedTeams={savedTeams}
                preferredTeamId={preferredTeamId}
                isStarting={isBusy}
                title={title}
                startLabel={t('battle.lobby.fight')}
                showPrivacy={false}
                headAction={view.canDecline ? decline : null}
                onStart={(team) => onStart({ id: team.teamId, name: team.name, members: team.members })}
                onCancel={onBack}
                inputRef={inputRef}
            />
        )
    );

    if (view.status === 'pending' && view.canAccept) {
        if (view.isRandom) {
            return (
                <Panel
                    title={t('battle.lobby.challengedRandom', { name })}
                    body={t('battle.lobby.randomBody')}
                    inputRef={inputRef}
                    onA={() => onAccept(null)}
                    onB={onBack}
                    actions={[
                        <button key="decline" type="button" className="ds-cmd is-plain" onClick={onDecline} disabled={isBusy}>{t('battle.lobby.decline')}</button>,
                        <button key="fight" type="button" className="ds-go" onClick={() => onAccept(null)} disabled={isBusy}>
                            {isBusy ? '…' : t('battle.lobby.fight')}
                        </button>,
                    ]}
                />
            );
        }
        return pickTeam(onAccept, t('battle.lobby.challenged', { name }));
    }

    if (view.status === 'pending') {
        return (
            <Panel
                title={t('battle.lobby.sentTitle', { name })}
                body={t('battle.lobby.sentBody', { name })}
                inputRef={inputRef}
                onB={onBack}
                actions={[
                    back,
                    <button key="cancel" type="button" className="ds-cmd is-plain" onClick={onCancel}>{t('battle.lobby.cancel')}</button>,
                ]}
            >
                <TeamRow team={myTeam} />
            </Panel>
        );
    }

    if (view.status === 'open') {
        return (
            <Panel
                title={t('battle.lobby.openTitle')}
                body={t('battle.lobby.openBody')}
                inputRef={inputRef}
                onB={onBack}
                actions={[
                    back,
                    <button key="cancel" type="button" className="ds-cmd is-plain" onClick={onCancel}>{t('battle.lobby.cancelInvite')}</button>,
                ]}
            />
        );
    }

    if (view.status === 'teamSelect' && view.isRandom) {
        return (
            <Panel
                title={t('battle.lobby.dealing')}
                body={t('battle.lobby.randomBody')}
                inputRef={inputRef}
                onA={onRoll}
                onB={onBack}
                actions={[
                    back,
                    <button key="roll" type="button" className="ds-go" onClick={onRoll} disabled={isBusy}>
                        {isBusy ? '…' : t('battle.randomDealBtn')}
                    </button>,
                ]}
            />
        );
    }

    if (view.status === 'teamSelect' && view.canSubmitTeam) {
        return pickTeam(onSubmitTeam, t('battle.lobby.pickAgainst', { name }));
    }

    if (view.status === 'teamSelect') {
        return (
            <Panel
                title={t('battle.lobby.waitingTeam', { name })}
                body={t('battle.lobby.waitingTeamBody')}
                inputRef={inputRef}
                onB={onBack}
                actions={[back]}
            >
                <TeamRow team={myTeam} />
            </Panel>
        );
    }

    // Declined or cancelled: the next step is another challenge, or the list.
    const declined = view.status === 'declined';
    return (
        <Panel
            title={declined ? t('battle.lobby.declinedTitle', { name }) : t('battle.lobby.cancelledTitle')}
            inputRef={inputRef}
            onA={onRematch || undefined}
            onB={onBack}
            actions={[
                back,
                ...(onRematch ? [<button key="again" type="button" className="ds-go" onClick={onRematch}>{t('battle.lobby.challengeAgain')}</button>] : []),
            ]}
        />
    );
}
