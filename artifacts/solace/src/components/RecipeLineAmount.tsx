import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UNIT_LIST, UNITS, isUnit } from "@/lib/units";

type Props = {
  lineId: string;
  quantity: number | string;
  unit: string;
  disabled?: boolean;
  onSave: (quantity: number, unit: string) => Promise<string | null>;
};

export function RecipeLineAmount({ lineId, quantity, unit, disabled, onSave }: Props) {
  const [q, setQ] = useState(String(Number(quantity)));
  const [u, setU] = useState(unit);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = Number(q) !== Number(quantity) || u !== unit;

  const submit = async () => {
    const num = Number(q);
    if (q.trim() === "" || !Number.isFinite(num) || num <= 0) return setErr("Enter a quantity above zero");
    if (!isUnit(u)) return setErr("Choose a valid unit");
    setErr(null); setBusy(true);
    const message = await onSave(num, u);
    setBusy(false);
    if (message) setErr(message);
  };

  return (
    <div className="flex flex-wrap items-end gap-2 pt-2">
      <div className="space-y-1">
        <Label htmlFor={`qty-${lineId}`} className="text-xs">Quantity</Label>
        <Input id={`qty-${lineId}`} className="w-24 h-9" type="number" min="0" step="any" value={q} disabled={disabled || busy} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`unit-${lineId}`} className="text-xs">Unit</Label>
        <select id={`unit-${lineId}`} className="h-9 border border-input rounded-md bg-background px-2 text-sm" value={u} disabled={disabled || busy} onChange={(e) => setU(e.target.value)}>
          {UNIT_LIST.map((x) => <option key={x} value={x}>{UNITS[x].label}</option>)}
        </select>
      </div>
      <Button size="sm" variant="outline" disabled={disabled || busy || !dirty} onClick={submit}>{busy ? "Saving…" : "Save amount"}</Button>
      {err && <p className="text-xs text-destructive basis-full" role="alert">{err}</p>}
    </div>
  );
}
