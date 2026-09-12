import React from 'react';
import { useTranslation } from 'react-i18next';

import { ConfidenceLevel } from '../../types/analysis';
import { Badge, BadgeTone } from '../ui/Badge';

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLevel }) {
  const { t } = useTranslation();

  const tone: Record<ConfidenceLevel, BadgeTone> = {
    high: 'success',
    medium: 'accent',
    low: 'warning',
  };

  const label: Record<ConfidenceLevel, string> = {
    high: t('analysis.confidenceHigh'),
    medium: t('analysis.confidenceMedium'),
    low: t('analysis.confidenceLow'),
  };

  return <Badge label={label[confidence]} tone={tone[confidence]} />;
}
