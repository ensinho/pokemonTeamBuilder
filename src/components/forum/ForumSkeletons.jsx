import React from 'react';

// Both mirror the real layout box for box (post-row / thread-post), so the
// content lands where the skeleton was and nothing shifts.

export function ThreadCardSkeleton() {
    return (
        <div className="post-row post-row--skeleton" aria-hidden="true">
            <div className="post-row__meta">
                <div className="forum-skeleton-circle post-row__avatar" />
                <div className="forum-skeleton-pill w-24 h-3" />
                <div className="forum-skeleton-pill w-16 h-3" />
            </div>
            <div className="post-row__main">
                <div className="post-row__text">
                    <div className="forum-skeleton-text w-3/4 h-5" />
                    <div className="forum-skeleton-text w-full h-3.5" />
                    <div className="forum-skeleton-text w-1/2 h-3.5" />
                </div>
            </div>
            <div className="post-row__actions">
                <div className="forum-skeleton-pill w-16 h-8" />
                <div className="forum-skeleton-pill w-12 h-8" />
                <div className="forum-skeleton-pill w-24 h-8" />
            </div>
        </div>
    );
}

export function ThreadDetailSkeleton() {
    return (
        <div className="thread-detail thread-detail--skeleton" aria-hidden="true">
            <div className="thread-detail__header-dock">
                <div className="thread-bar">
                    <div className="forum-skeleton-pill w-8 h-8" />
                    <div className="forum-skeleton-pill w-32 h-4" />
                </div>
            </div>
            <div className="thread-messages-scroll">
                <div className="thread-post">
                    <div className="thread-post__meta">
                        <div className="forum-skeleton-circle thread-post__avatar" />
                        <div className="forum-skeleton-pill w-28 h-3.5" />
                    </div>
                    <div className="forum-skeleton-text w-2/3 h-7" />
                    <div className="forum-skeleton-text w-full h-4" />
                    <div className="forum-skeleton-text w-5/6 h-4" />
                    <div className="thread-post__actions">
                        <div className="forum-skeleton-pill w-16 h-8" />
                        <div className="forum-skeleton-pill w-12 h-8" />
                        <div className="forum-skeleton-pill w-28 h-8" />
                    </div>
                </div>
                <div className="comment-list">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="cmt">
                            <div className="forum-skeleton-circle cmt__avatar" />
                            <div className="cmt__byline"><div className="forum-skeleton-pill w-32 h-3.5" /></div>
                            <div className="cmt__content">
                                <div className="forum-skeleton-text w-full h-3.5" />
                                <div className="forum-skeleton-text w-3/4 h-3.5" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
