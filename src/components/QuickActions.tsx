interface Props {
  canCopyYesterday: boolean;
  onSameAsYesterday: () => void;
  onOpenSearch: () => void;
}

export function QuickActions({
  canCopyYesterday,
  onSameAsYesterday,
  onOpenSearch,
}: Props) {
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
    </div>
  );
}
