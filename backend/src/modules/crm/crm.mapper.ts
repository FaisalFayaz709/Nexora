export function toCrmDto(row: any) {
  if (!row) return row;
  const out: any = { ...row };
  for (const key of ['estimatedValue','subtotal','taxTotal','total','amount','quantity','unitPrice','lineTotal','estimatedEffortHours']) {
    if (out[key] && typeof out[key].toString === 'function') out[key] = out[key].toString();
  }
  if (Array.isArray(out.items)) out.items = out.items.map(toCrmDto);
  return out;
}
