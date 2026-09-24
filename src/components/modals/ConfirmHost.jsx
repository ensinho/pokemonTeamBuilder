import React from 'react';
import { useConfirmStore } from '../../store/useConfirmStore';
import { ConfirmDialog } from './ConfirmDialog';

/** Renders whatever `confirmAction()` is currently asking. Mounted once. */
export function ConfirmHost() {
    const request = useConfirmStore((state) => state.request);
    const settle = useConfirmStore((state) => state.settle);

    return (
        <ConfirmDialog
            isOpen={Boolean(request)}
            onClose={() => settle(false)}
            onConfirm={() => settle(true)}
            title={request?.title}
            message={request?.message}
            confirmText={request?.confirmText}
        />
    );
}
