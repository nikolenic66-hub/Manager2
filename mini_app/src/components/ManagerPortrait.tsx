import React, { useEffect, useState } from 'react';

type ManagerPortraitProps = {
  avatarId?: number;
  className?: string;
  title?: string;
};

const MANAGER_ASSET_COUNT = 8;

/** Separate portrait family for managers/coaches; never reuses player portraits. */
export default function ManagerPortrait({ avatarId = 1, className = '', title = 'Аватар менеджера' }: ManagerPortraitProps) {
  const safeId = Math.max(1, Math.min(MANAGER_ASSET_COUNT, Math.trunc(Number(avatarId) || 1)));
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [safeId]);
  const src = failed
    ? '/assets/graphics/managers/manager-01.webp'
    : `/assets/graphics/managers/manager-${String(safeId).padStart(2, '0')}.webp`;

  return (
    <span className={`fm-manager-portrait ${className}`.trim()} title={title} role="img" aria-label={title}>
      <img
        src={src}
        alt={title}
        loading="eager"
        decoding="async"
        onError={() => { if (!failed) setFailed(true); }}
      />
    </span>
  );
}
