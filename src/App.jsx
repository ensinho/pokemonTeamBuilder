import React, { useEffect } from 'react';
import AppLayout from './components/AppLayout';
import { useAuthStore } from './store/useAuthStore';
import { useReferenceStore } from './store/useReferenceStore';

export default function App() {
    const initAuth = useAuthStore((state) => state.initAuth);
    const cleanupAuth = useAuthStore((state) => state.cleanupAuth);
    const fetchReferenceData = useReferenceStore((state) => state.fetchReferenceData);

    useEffect(() => {
        // Initialize auth listener
        initAuth();

        // Fetch reference data (generations, items, natures)
        fetchReferenceData();

        return () => {
            // Clean up auth listener on unmount
            cleanupAuth();
        };
    }, [initAuth, cleanupAuth, fetchReferenceData]);

    return <AppLayout />;
}
