import React, { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { useMascotStore } from '../../../store/useMascotStore';
import { Mascot } from '../../Mascot';

/**
 * A password input with the eye: on a phone, typing blind is the error.
 * While any password field has focus the mascot (`mascot` — one per dialog)
 * covers his eyes, and peeks through his paws when the password is shown —
 * the Rive login bear's idea (2026-11-06).
 */
export function PasswordField({ label, value, onChange, autoComplete, enterKeyHint, autoFocus, minLength, describedBy, invalid = false, inputRef, mascot = false, icon: Icon = null, filled = false }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [focused, setFocused] = useState(false);
    const setCover = useMascotStore((s) => s.setCover);
    useEffect(() => {
        if (focused) setCover(visible ? 'peek' : 'cover');
    }, [focused, visible, setCover]);
    useEffect(() => () => setCover(null), [setCover]);
    return (
        <label className={`field ${filled ? 'field--filled' : ''}`}>
            <span className="field-label">{label}</span>
            <span className="auth-password field__control">
                {mascot && <Mascot size="md" coverable seasonal={false} className="auth-password__mascot" />}
                {Icon && <Icon className="field__icon" aria-hidden="true" />}
                <input
                    ref={inputRef}
                    type={visible ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint={enterKeyHint}
                    autoFocus={autoFocus}
                    required
                    minLength={minLength}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    aria-describedby={describedBy}
                    aria-invalid={invalid || undefined}
                    onFocus={() => setFocused(true)}
                    onBlur={() => { setFocused(false); setCover(null); }}
                    className="input-clean"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    // keep focus in the field, so toggling reads as one gesture (and he peeks)
                    onMouseDown={(e) => e.preventDefault()}
                    aria-label={visible ? t('modals.authHidePassword') : t('modals.authShowPassword')}
                    aria-pressed={visible}
                    className="btn btn-ghost btn-icon btn-sm auth-password__toggle"
                >
                    {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
            </span>
        </label>
    );
}
