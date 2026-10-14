import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

/** A password input with the eye: on a phone, typing blind is the error. */
export function PasswordField({ label, value, onChange, autoComplete, enterKeyHint, autoFocus, minLength, describedBy }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            <span className="auth-password">
                <input
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
                    className="input-clean"
                    placeholder="••••••••"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
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
