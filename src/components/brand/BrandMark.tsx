import { Video } from 'lucide-react';

interface BrandMarkProps {
  compact?: boolean;
  dark?: boolean;
}

export function BrandMark({ compact = false, dark = false }: BrandMarkProps) {
  return (
    <div className="brand-mark" aria-label="Aao Milo">
      <div className="brand-mark__icon">
        <Video size={compact ? 16 : 24} strokeWidth={2.4} />
      </div>
      <span className={dark ? 'brand-mark__text brand-mark__text--dark' : 'brand-mark__text'}>
        Aao Milo
      </span>
    </div>
  );
}
