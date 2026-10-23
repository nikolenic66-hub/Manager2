import React, { useEffect, useMemo, useState } from 'react';

type PlayerPortraitProps = {
  name?: string;
  seed?: number | string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  title?: string;
};

const PLAYER_ASSET_COUNT = 24;

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function resolvePlayerAsset(seed: number | string | undefined, name: string): string {
  // Player identities stay consistent across squad, scouting, market, academy and pack cards.
  const seedText = `${seed ?? ''}:${name}`;
  const index = (stableHash(seedText) % PLAYER_ASSET_COUNT) + 1;
  return `/assets/graphics/players/player-${String(index).padStart(2, '0')}.webp`;
}

function validPortraitUrl(value?: string | null): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  const url = value.trim();
  // Legacy server art contains emoji-like portraits and silhouette card templates. Do not
  // let those URLs override the new photographic in-app player library, even when absolute.
  const pathOnly = url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0];
  if (/\/assets\/portraits\/.*_avatar\.png$/i.test(`/${pathOnly.replace(/^\//, '')}`)) return '';
  if (/\/assets\/visual\/cards\/(?:player|market_player|contract_player|scout_player|shortlist_player)_\d+\.png$/i.test(pathOnly)) return '';
  if (/^(https?:\/\/|\/api\/media\/|\/media\/|\/uploads\/)/i.test(url)) return url;
  return '';
}

/**
 * Photo-based fictional player portrait. A valid uploaded/API portrait wins;
 * old placeholder assets are intentionally replaced by the local portrait library.
 */
export default function PlayerPortrait({
  name = 'Player', seed, imageUrl, size, className = '', title,
}: PlayerPortraitProps) {
  const localSrc = useMemo(() => resolvePlayerAsset(seed, name), [seed, name]);
  const remoteSrc = validPortraitUrl(imageUrl);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => setRemoteFailed(false), [remoteSrc]);

  const src = remoteSrc && !remoteFailed ? remoteSrc : localSrc;

  return (
    <span
      className={`fm-player-portrait ${className}`.trim()}
      style={size ? { width: size, height: size } : undefined}
      title={title || name}
      aria-label={name}
      role="img"
    >
      <img
        className="fm-player-portrait-image"
        src={src}
        alt={name}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (remoteSrc && !remoteFailed) setRemoteFailed(true);
        }}
      />
    </span>
  );
}
