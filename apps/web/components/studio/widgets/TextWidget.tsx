// @ts-nocheck
'use client';

import { StudioWidget } from '@/lib/hooks/useApi';

interface TextWidgetProps {
  widget: StudioWidget;
}

export default function TextWidget({ widget }: TextWidgetProps) {
  const text = widget.manual_data?.text || 'Enter your text content here...';
  const fontSize = widget.manual_data?.fontSize || 'medium';
  const alignment = widget.manual_data?.alignment || 'left';

  const getFontSize = () => {
    switch (fontSize) {
      case 'small': return '13px';
      case 'large': return '20px';
      case 'xlarge': return '28px';
      default: return '16px';
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
      padding: '8px'
    }}>
      <div style={{
        fontSize: getFontSize(),
        lineHeight: 1.5,
        color: 'var(--text-primary)',
        textAlign: alignment as 'left' | 'center' | 'right',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {text}
      </div>
    </div>
  );
}
