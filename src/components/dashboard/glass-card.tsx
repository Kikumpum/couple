import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-black/5 bg-white p-6 shadow-premium transition duration-300",
        className
      )}
    >
      {children}
    </section>
  );
}
