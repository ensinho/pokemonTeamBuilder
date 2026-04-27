export const SkeletonCard = () => (
    <div className="rounded-lg p-3 text-center h-[172px] overflow-hidden relative bg-surface-raised">
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mx-auto h-24 w-24 rounded-md animate-pulse bg-surface" />
        <div className="mt-2 h-5 w-20 mx-auto rounded animate-pulse bg-surface" />
        <div className="flex justify-center items-center mt-2 gap-2">
            <div className="h-5 w-5 rounded-full animate-pulse bg-surface" />
            <div className="h-5 w-5 rounded-full animate-pulse bg-surface" />
        </div>
    </div>
);
