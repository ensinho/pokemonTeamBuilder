import React from 'react';

export function ThreadCardSkeleton() {
    return (
        <div className="thread-card thread-card--skeleton" aria-hidden="true">
            <div className="thread-card__avatar-col">
                <div className="forum-skeleton-circle w-10 h-10" />
            </div>
            <div className="thread-card__content">
                <div className="flex items-center gap-2 mb-2">
                    <div className="forum-skeleton-pill w-16 h-5" />
                    <div className="forum-skeleton-pill w-20 h-5" />
                </div>
                <div className="forum-skeleton-text w-3/4 h-5 mb-2" />
                <div className="forum-skeleton-text w-1/2 h-3.5 mb-3" />
                <div className="flex items-center gap-4 mt-2">
                    <div className="forum-skeleton-pill w-24 h-4" />
                    <div className="forum-skeleton-pill w-16 h-4" />
                    <div className="forum-skeleton-pill w-16 h-4" />
                </div>
            </div>
        </div>
    );
}

export function ThreadDetailSkeleton() {
    return (
        <div className="thread-detail thread-detail--skeleton" aria-hidden="true">
            <div className="thread-header mb-6">
                <div className="forum-skeleton-pill w-32 h-6 mb-3" />
                <div className="forum-skeleton-text w-2/3 h-7 mb-3" />
                <div className="flex items-center gap-3">
                    <div className="forum-skeleton-circle w-8 h-8" />
                    <div className="forum-skeleton-pill w-28 h-4" />
                    <div className="forum-skeleton-pill w-20 h-4" />
                </div>
            </div>
            <div className="thread-op-card p-6 mb-6">
                <div className="forum-skeleton-text w-full h-4 mb-2" />
                <div className="forum-skeleton-text w-5/6 h-4 mb-2" />
                <div className="forum-skeleton-text w-4/6 h-4 mb-4" />
                <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="forum-skeleton-circle w-10 h-10" />
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-4">
                        <div className="forum-skeleton-circle w-8 h-8 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="forum-skeleton-pill w-32 h-4" />
                            <div className="forum-skeleton-text w-full h-3.5" />
                            <div className="forum-skeleton-text w-3/4 h-3.5" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
