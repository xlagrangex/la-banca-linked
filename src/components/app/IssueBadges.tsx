import { ImageOff, FileWarning, CircleDashed } from "lucide-react";
import { ISSUE_LABEL, postIssues, type Issue } from "@/lib/readiness";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLE: Record<Issue, { cls: string; icon: React.ElementType }> = {
  immagine: { cls: "bg-red-50 text-red-700 ring-red-200", icon: ImageOff },
  testo: { cls: "bg-orange-50 text-orange-700 ring-orange-200", icon: FileWarning },
  stato: { cls: "bg-slate-50 text-slate-600 ring-slate-200", icon: CircleDashed },
};

export function IssueBadge({ issue, className }: { issue: Issue; className?: string }) {
  const { cls, icon: Icon } = STYLE[issue];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls, className)}>
      <Icon className="h-3 w-3" /> {ISSUE_LABEL[issue]}
    </span>
  );
}

export default function IssueBadges({ post, only }: { post: Post; only?: Issue[] }) {
  const issues = postIssues(post).filter((i) => !only || only.includes(i));
  if (!issues.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {issues.map((i) => (
        <IssueBadge key={i} issue={i} />
      ))}
    </div>
  );
}
