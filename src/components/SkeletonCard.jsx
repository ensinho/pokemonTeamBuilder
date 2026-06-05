export const SkeletonCard = () => (
    <div className="pokemon-card p-3 flex flex-col items-center justify-between min-h-[11.5rem]">
        <div className="pokemon-card__topbar">
            <div className="flex gap-1">
                <div className="h-4 w-4 rounded-full skeleton" />
                <div className="h-4 w-4 rounded-full skeleton" />
            </div>
            <div className="h-4 w-12 rounded-full skeleton" />
        </div>
        <div className="mx-auto h-20 w-20 rounded-md skeleton" style={{ margin: '0.1rem auto 0' }} />
        <div className="mt-2 h-4 w-20 mx-auto rounded skeleton" />
        <div className="h-7 w-full rounded-md skeleton mt-auto" />
    </div>
);
