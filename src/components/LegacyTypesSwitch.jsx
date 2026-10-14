import React from 'react';
import { Switch } from './Switch';
import { useActiveTeamStore } from '../store/useActiveTeamStore';
import { useTranslation } from '../hooks/useTranslation';

/**
 * The builder's pre-Fairy toggle (desktop analysis card and the phone's
 * analysis sheet). Reads the store directly so neither view threads it.
 */
export function LegacyTypesSwitch({ className = '' }) {
    const { t } = useTranslation();
    const legacyTypes = useActiveTeamStore((s) => s.legacyTypes);
    const setLegacyTypes = useActiveTeamStore((s) => s.setLegacyTypes);
    return (
        <Switch
            variant="row"
            size="sm"
            checked={legacyTypes}
            onChange={setLegacyTypes}
            label={t('builder.legacyTypesLabel')}
            description={t('builder.legacyTypesDesc')}
            className={className}
        />
    );
}
