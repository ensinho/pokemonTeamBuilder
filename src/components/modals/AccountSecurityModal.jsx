import React from 'react';
import { ChangePasswordDialog } from './auth/ChangePasswordDialog';
import { DeleteAccountDialog } from './auth/DeleteAccountDialog';

/** Profile's account actions: 'password' or 'delete'. Each is its own place. */
export function AccountSecurityModal({ mode, onClose }) {
    return mode === 'delete'
        ? <DeleteAccountDialog onClose={onClose} />
        : <ChangePasswordDialog onClose={onClose} />;
}
