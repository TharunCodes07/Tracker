import { AlertTriangle } from "lucide-react";

export function ProjectError({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-background p-10 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h1 className="mt-3 text-lg font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
