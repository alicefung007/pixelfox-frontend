import { Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  zoom: number;
  isAutoZoom: boolean;
  onZoomStep: (direction: 'in' | 'out') => void;
  onAutoZoom: () => void;
};

export default function ZoomToolbar({ zoom, isAutoZoom, onZoomStep, onAutoZoom }: Props) {
  return (
    <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-1 sm:gap-2 rounded-lg border border-border bg-popover text-popover-foreground shadow-sm p-1 z-20">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => onZoomStep('out')}
      >
        <Minus size={16} />
      </Button>
      <div className="text-xs font-medium w-10 sm:w-12 text-center text-muted-foreground">
        {zoom}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={() => onZoomStep('in')}
      >
        <Plus size={16} />
      </Button>
      <div className="w-px h-4 bg-border mx-0.5 sm:mx-1" />
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 ${isAutoZoom ? 'text-primary' : 'text-muted-foreground'}`}
        onClick={onAutoZoom}
        title="Fit to Screen"
      >
        <Maximize size={16} />
      </Button>
    </div>
  );
}
