export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  actor?: string;
  occurredAt?: string;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-4 border-l pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border bg-background" />
          <div className="text-sm font-medium">{item.title}</div>
          {item.description ? <p className="mt-1 text-sm text-muted-foreground">{item.description}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{[item.actor, item.occurredAt].filter(Boolean).join(' · ')}</p>
        </li>
      ))}
    </ol>
  );
}

export const AuditTimeline = ActivityTimeline;
export const ApprovalTimeline = ActivityTimeline;
