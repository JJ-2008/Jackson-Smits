import type { FavFood } from "../types";

interface Props {
  favourites: FavFood[];
  recents: FavFood[];
  canCopyYesterday: boolean;
  onQuickAdd: (fav: FavFood) => void;
  onRemoveFavourite: (id: string) => void;
  onSaveRecentAsFav: (fav: FavFood) => void;
  onSameAsYesterday: () => void;
  onOpenSearch: () => void;
}

export function QuickAdd({
  favourites,
  recents,
  canCopyYesterday,
  onQuickAdd,
  onRemoveFavourite,
  onSaveRecentAsFav,
  onSameAsYesterday,
  onOpenSearch,
}: Props) {
  const nothing = favourites.length === 0 && recents.length === 0;

  return (
    <div className="card quick-add">
      <div className="qa-actions">
        <button className="qa-action" onClick={onOpenSearch}>
          🔍 Search foods
        </button>
        {canCopyYesterday && (
          <button className="qa-action" onClick={onSameAsYesterday}>
            📋 Same as yesterday
          </button>
        )}
      </div>

      {favourites.length > 0 && (
        <>
          <div className="qa-label">⭐ Favourites</div>
          <div className="qa-chips">
            {favourites.map((f) => (
              <div className="qa-chip fav" key={f.id}>
                <button className="qa-chip-body" onClick={() => onQuickAdd(f)}>
                  <span className="qa-name">{f.name}</span>
                  <span className="qa-cal">{Math.round(f.calories)} kcal</span>
                </button>
                <button
                  className="qa-chip-x"
                  aria-label={`Remove ${f.name} from favourites`}
                  onClick={() => onRemoveFavourite(f.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {recents.length > 0 && (
        <>
          <div className="qa-label">🕘 Recent</div>
          <div className="qa-chips">
            {recents.map((f) => (
              <div className="qa-chip" key={f.id}>
                <button className="qa-chip-body" onClick={() => onQuickAdd(f)}>
                  <span className="qa-name">{f.name}</span>
                  <span className="qa-cal">{Math.round(f.calories)} kcal</span>
                </button>
                <button
                  className="qa-chip-x star"
                  aria-label={`Save ${f.name} to favourites`}
                  onClick={() => onSaveRecentAsFav(f)}
                >
                  ☆
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {nothing && (
        <p className="hint" style={{ marginTop: 0 }}>
          Log a few foods and they'll show here for one-tap re-logging. Tap ☆ to
          save a favourite.
        </p>
      )}
    </div>
  );
}
