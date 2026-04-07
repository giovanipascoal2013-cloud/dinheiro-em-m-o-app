import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RatingWidgetProps {
  likes: number;
  dislikes: number;
  userVote?: 'like' | 'dislike' | null;
  disabled?: boolean;
  onVote?: (value: 'like' | 'dislike') => void;
}

export function RatingWidget({ 
  likes, 
  dislikes, 
  userVote = null, 
  disabled = false,
  onVote 
}: RatingWidgetProps) {
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (value: 'like' | 'dislike') => {
    if (disabled || isVoting || userVote === value) return;
    
    setIsVoting(true);
    try {
      await onVote?.(value);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Like button */}
      <Button
        variant={userVote === 'like' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote('like')}
        disabled={disabled || isVoting}
        className={cn(
          "gap-2 min-w-[80px]",
          userVote === 'like' && "bg-success text-success-foreground hover:bg-success/90 shadow-md"
        )}
      >
        <ThumbsUp className={cn(
          "h-4 w-4",
          userVote === 'like' && "fill-current"
        )} />
        <span className="font-semibold">{likes}</span>
      </Button>

      {/* Dislike button */}
      <Button
        variant={userVote === 'dislike' ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => handleVote('dislike')}
        disabled={disabled || isVoting}
        className={cn(
          "gap-2 min-w-[80px]",
          userVote === 'dislike' && "shadow-md"
        )}
      >
        <ThumbsDown className={cn(
          "h-4 w-4",
          userVote === 'dislike' && "fill-current"
        )} />
        <span className="font-semibold">{dislikes}</span>
      </Button>
    </div>
  );
}

interface RatingCTAProps {
  agentName: string;
  onRate: () => void;
}

export function RatingCTA({ agentName, onRate }: RatingCTAProps) {
  return (
    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
      <p className="text-sm text-foreground mb-3">
        <span className="font-medium">Avalie a fiabilidade do agente {agentName}</span>
        <span className="text-muted-foreground"> — ajude toda a comunidade a encontrar ATMs com dinheiro!</span>
      </p>
      <Button variant="outline" size="sm" onClick={onRate}>
        Avaliar agora
      </Button>
    </div>
  );
}
