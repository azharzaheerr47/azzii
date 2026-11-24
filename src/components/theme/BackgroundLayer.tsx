import React from 'react';
import {
  buildCustomBackgroundImageStyle,
  buildCustomBackgroundOverlayColor,
  optimizeCloudinaryBackgroundUrl,
} from '../../lib/themeLogic';
import type { CustomBackgroundConfig } from '../../types/index';

interface BackgroundLayerProps {
  active: boolean;
  config: CustomBackgroundConfig | null;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({ active, config }) => {
  if (!active || !config || !config.url) {
    return null;
  }

  const imgStyle = buildCustomBackgroundImageStyle(config);
  const overlayColor = buildCustomBackgroundOverlayColor(config);
  const optimizedUrl = optimizeCloudinaryBackgroundUrl(config.url);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300"
    >
      <img
        src={optimizedUrl}
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-[filter,transform,object-position] duration-300 will-change-transform"
        style={{
          objectPosition: imgStyle.objectPosition,
          transform: imgStyle.transform,
          filter: imgStyle.filter,
        }}
      />
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{ backgroundColor: overlayColor }}
      />
    </div>
  );
};
