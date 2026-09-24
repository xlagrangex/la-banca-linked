"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PILLARS } from "@/lib/labels";

export default function PillarInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = value && !PILLARS.includes(value) ? [...PILLARS, value] : PILLARS;
  return (
    <Select value={value || "_none"} onValueChange={(v) => onChange(v === "_none" ? "" : v)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_none">Nessun pilastro</SelectItem>
        {options.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
