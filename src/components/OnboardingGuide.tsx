import { useState } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface OnboardingGuideProps {
  storageKey: string;
  steps: OnboardingStep[];
}

export function OnboardingGuide({ storageKey, steps }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(() => !localStorage.getItem(storageKey));

  if (!open || steps.length === 0) return null;

  const complete = () => {
    localStorage.setItem(storageKey, 'true');
    setOpen(false);
  };

  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) complete(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Step counter + skip */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {currentStep + 1} de {steps.length}
            </span>
            <button onClick={complete} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Pular
            </button>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-primary/10 rounded-2xl p-4">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button
              variant={isLast ? 'hero' : 'default'}
              className="flex-1"
              onClick={() => isLast ? complete() : setCurrentStep(s => s + 1)}
            >
              {isLast ? 'Começar!' : 'Próximo'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === currentStep ? "bg-primary w-4" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
