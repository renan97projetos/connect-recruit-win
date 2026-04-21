// Custom CSS overrides for driver.js to match the Sinapse design system.
export function OnboardingTourStyles() {
  return (
    <style>{`
      .driver-popover {
        border-radius: 12px;
        box-shadow: 0 20px 50px -12px rgba(0,0,0,0.18);
        border: 1px solid hsl(var(--border));
        font-family: inherit;
        max-width: 360px;
      }
      .driver-popover-title {
        font-size: 15px;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin-bottom: 6px;
      }
      .driver-popover-description {
        font-size: 13px;
        color: hsl(var(--muted-foreground));
        line-height: 1.55;
      }
      .driver-popover-description b {
        color: hsl(var(--foreground));
        font-weight: 600;
      }
      .driver-popover-progress-text {
        font-size: 11px;
        color: hsl(var(--muted-foreground));
        font-weight: 500;
      }
      .driver-popover-footer button {
        font-size: 12px;
        font-weight: 500;
        padding: 6px 12px;
        border-radius: 6px;
        text-shadow: none;
        background: transparent;
        color: hsl(var(--muted-foreground));
        border: 1px solid hsl(var(--border));
      }
      .driver-popover-footer button:hover {
        background: hsl(var(--muted));
      }
      .driver-popover-next-btn {
        background: hsl(var(--primary)) !important;
        color: hsl(var(--primary-foreground)) !important;
        border-color: hsl(var(--primary)) !important;
      }
      .driver-popover-next-btn:hover {
        opacity: 0.92;
      }
      .driver-popover-close-btn {
        color: hsl(var(--muted-foreground));
      }
    `}</style>
  );
}
