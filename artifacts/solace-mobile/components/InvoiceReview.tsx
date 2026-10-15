import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { getDocument, getDocumentUrl, removeDocuments, useApproveSupplierInvoice, useExtractSupplierInvoice, type InvoiceApprovalResult } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { DOC_LABEL, STATUS_LABEL, lineUnitCost, totalsCheck, type InvLine, type MatchIng } from '@workspace/recipe-engine/invoices';
import { UNIT_LIST, UNITS, isUnit } from '@workspace/recipe-engine/units';
import { Button, Card, Field, Loading, Notice, Row, Screen, Title, Txt } from './ui';
import { useAppState } from '@/providers/AppState';
import { apiOrigin, eq, money, rows, type Invoice } from '@/lib/domain';

const headerText = ['vendor_name', 'invoice_number', 'invoice_date'] as const;
const headerNumbers = ['subtotal', 'discount', 'tax', 'delivery', 'total'] as const;
const lineNumbers = ['quantity', 'pack_count', 'pack_size', 'unit_price', 'line_total'] as const;
const labels: Record<string, string> = { vendor_name: 'Vendor', invoice_number: 'Invoice number', invoice_date: 'Invoice date (YYYY-MM-DD)', subtotal: 'Subtotal', discount: 'Discount', tax: 'Tax', delivery: 'Delivery', total: 'Total', quantity: 'Quantity', pack_count: 'Units per pack', pack_size: 'Size each', unit_price: 'Price per pack', line_total: 'Line total' };
const draft = (value: object) => Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v == null ? '' : String(v)]));
function number(value: string, label: string) {
  if (!value.trim()) return null;
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${label} must be a number.`);
  return result;
}
function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Continue', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}
type DocumentImage = { uri: string; headers?: Record<string, string> };

export function InvoiceReview({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const app = useAppState(), { getToken } = useAuth(), queryClient = useQueryClient();
  const approveMutation = useApproveSupplierInvoice(), extractMutation = useExtractSupplierInvoice();
  const [inv, setInv] = useState<Invoice>(invoice), [lines, setLines] = useState<InvLine[]>([]);
  const [ingredients, setIngredients] = useState<MatchIng[]>([]), [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [header, setHeader] = useState<Record<string, string>>(draft(invoice));
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false);
  const [error, setError] = useState<unknown>(null), [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState<DocumentImage[]>([]), [documentError, setDocumentError] = useState<unknown>(null);
  const [chooseFor, setChooseFor] = useState<string | null>(null), [search, setSearch] = useState('');
  const [newFor, setNewFor] = useState<InvLine | null>(null), [newName, setNewName] = useState(''), [newBase, setNewBase] = useState('g');
  const [result, setResult] = useState<InvoiceApprovalResult | null>(null);
  const [deleted, setDeleted] = useState(false);
  const lifetime = useRef(true);
  const blobUrls = useRef<string[]>([]);
  const canManage = app.canManage && app.restaurant?.id === inv.restaurant_id;
  const locked = !canManage || inv.status === 'approved' || inv.status === 'extracting';
  const editable = !locked && !busy && !loading;

  async function load() {
    const [current, fetchedLines, catalog, sites] = await Promise.all([
      rows<Invoice>({ table: 'invoices', operation: 'select', filters: [eq('id', invoice.id)] }),
      rows<InvLine>({ table: 'invoice_lines', operation: 'select', filters: [eq('invoice_id', invoice.id)], orders: [{ column: 'position' }] }),
      rows<MatchIng>({ table: 'ingredients', operation: 'select', filters: [eq('restaurant_id', invoice.restaurant_id)], orders: [{ column: 'name' }] }),
      rows<{ id: string; name: string }>({ table: 'locations', operation: 'select', filters: [eq('restaurant_id', invoice.restaurant_id)] }),
    ]);
    if (!current[0]) throw new Error('This invoice is no longer available.');
    if (!lifetime.current) return;
    setInv(current[0]); setHeader(draft(current[0])); setLines(fetchedLines); setEdits(Object.fromEntries(fetchedLines.map(l => [l.id, draft(l)])));
    setIngredients(catalog); setLocations(sites); setDirty(false); setChooseFor(null);
  }
  async function reload() {
    if (dirty && !await confirmAction('Discard unsaved edits?', 'Reloading replaces your unsaved invoice edits.')) return;
    setLoading(true); setError(null);
    try { await load(); } catch (e) { setError(e); } finally { if (lifetime.current) setLoading(false); }
  }
  useEffect(() => {
    lifetime.current = true; void reload();
    return () => { lifetime.current = false; blobUrls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  async function loadDocuments() {
    setDocumentError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sign in again to view this private document.');
      const images = await Promise.all(inv.file_paths.filter(p => !p.toLowerCase().endsWith('.pdf')).map(async path => {
        const { signedUrl } = await getDocumentUrl({ path });
        if (Platform.OS === 'web') {
          const fileId = signedUrl.split('/').pop()!;
          const blob = await getDocument(fileId, { responseType: 'blob' });
          const uri = URL.createObjectURL(blob);
          if (!lifetime.current) { URL.revokeObjectURL(uri); return { uri: '' }; }
          blobUrls.current.push(uri);
          return { uri };
        }
        return { uri: signedUrl.startsWith('/') ? `${apiOrigin}${signedUrl}` : signedUrl, headers: { Authorization: `Bearer ${token}` } };
      }));
      if (lifetime.current) setDocuments(images);
    } catch (e) { if (lifetime.current) setDocumentError(e); }
  }
  // Both platforms authorize the private document request with Clerk, never a
  // public object URL or a bearer token embedded in the URL.
  useEffect(() => { void loadDocuments(); }, [inv.file_paths.join('|')]);
  function changeHeader(key: string, value: string) { setHeader(h => ({ ...h, [key]: value })); setDirty(true); setSuccess(''); }
  function changeLine(id: string, patch: Record<string, string>) {
    setEdits(old => ({ ...old, [id]: { ...old[id], ...patch } })); setDirty(true); setSuccess('');
  }
  function parsedDrafts() {
    const headerPatch = { ...Object.fromEntries(headerText.map(k => [k, header[k]?.trim() || null])),
      ...Object.fromEntries(headerNumbers.map(k => [k, number(header[k] || '', labels[k])])), doc_type: header.doc_type,
      location_id: header.location_id || null, corrects_invoice_id: header.corrects_invoice_id || null };
    const parsedLines = lines.map(l => {
      const e = edits[l.id] || draft(l);
      return { ...l, ...Object.fromEntries(lineNumbers.map(k => [k, number(e[k] || '', `${l.description}: ${labels[k]}`)])),
        description: e.description, product_code: e.product_code || null, pack_unit: e.pack_unit || null, ingredient_id: e.ingredient_id || null,
        match_status: e.match_status, match_reason: e.match_reason || null } as InvLine;
    });
    return { headerPatch, parsedInvoice: { ...inv, ...headerPatch } as Invoice, parsedLines };
  }
  let validation: ReturnType<typeof totalsCheck> | null = null;
  let previewLines = lines;
  try { const parsed = parsedDrafts(); validation = totalsCheck(parsed.parsedInvoice, parsed.parsedLines); previewLines = parsed.parsedLines; } catch { /* Save reports invalid input without replacing the draft. */ }
  const duplicates = app.workspace.invoices.filter(other => other.id !== inv.id && other.restaurant_id === inv.restaurant_id &&
    ((inv.file_hash && inv.file_hash === other.file_hash) || (header.invoice_number && header.invoice_number === other.invoice_number &&
      (header.vendor_name || '').toLowerCase() === (other.vendor_name || '').toLowerCase())));

  async function persist() {
    const parsed = parsedDrafts();
    await rows({ table: 'invoices', operation: 'update', filters: [eq('id', inv.id)], payload: parsed.headerPatch });
    for (const line of parsed.parsedLines) {
      const { description, product_code, quantity, pack_count, pack_size, pack_unit, unit_price, line_total, ingredient_id, match_status, match_reason } = line;
      await rows({ table: 'invoice_lines', operation: 'update', filters: [eq('id', line.id)], payload: { description, product_code, quantity, pack_count, pack_size, pack_unit, unit_price, line_total, ingredient_id, match_status, match_reason } });
    }
    // Manual entry after a failed read is supported without re-running AI.
    if (inv.status !== 'review') await rows({ table: 'invoices', operation: 'update', filters: [eq('id', inv.id)], payload: { status: 'review', extraction_error: null } });
    return parsed;
  }
  async function save() {
    setBusy(true); setError(null); setSuccess('');
    try { await persist(); await load(); await app.refresh(); setSuccess('Review saved. Prices have not changed.'); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function extract() {
    if (lines.length || dirty) {
      if (!await confirmAction('Re-read invoice?', 'This replaces all line-item edits and matches. Unsaved edits will be discarded.')) return;
    }
    setBusy(true); setError(null); setSuccess('');
    try {
      await extractMutation.mutateAsync({ invoiceId: inv.id }); await load(); await app.refresh(); setSuccess('Read complete. Check the original, then confirm each match.');
    } catch (e) { setError(e); if (!dirty) { try { await load(); } catch { /* Preserve the extraction error for retry. */ } } }
    finally { setBusy(false); }
  }
  async function approve() {
    let parsed: ReturnType<typeof parsedDrafts>;
    try { parsed = parsedDrafts(); } catch (e) { setError(e); return; }
    const check = totalsCheck(parsed.parsedInvoice, parsed.parsedLines);
    if (!await confirmAction('Approve and update shared prices?', check.issues.length
      ? `Totals do not reconcile:\n${check.issues.join('\n')}\n\nContinue despite this mismatch? Matching and conversion errors must still be fixed.`
      : 'This locks the invoice, records purchase history, and updates ingredient costs used by both apps. Credits and returns do not change prices.')) return;
    setBusy(true); setError(null); setSuccess('');
    try {
      // A response can be lost after the server commits. Do not attempt to edit
      // the now-locked invoice before asking for the idempotent approval result.
      const [current] = await rows<Invoice>({ table: 'invoices', operation: 'select', filters: [eq('id', inv.id)] });
      if (current?.status !== 'approved') await persist();
      const approved = await approveMutation.mutateAsync({ invoiceId: inv.id, data: { accept_total_mismatch: check.issues.length > 0 } });
      setResult(approved); setSuccess(approved.already_approved ? 'This invoice was already approved. No duplicate prices were recorded.' : 'Approved. Shared ingredient costs and price history updated.');
      await load(); await queryClient.invalidateQueries(); await app.refresh();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function createIngredient() {
    if (!newFor || !newName.trim() || !app.account) return;
    setBusy(true); setError(null);
    try {
      const line = parsedDrafts().parsedLines.find(l => l.id === newFor.id)!;
      const [created] = await rows<MatchIng>({ table: 'ingredients', operation: 'insert', payload: {
        restaurant_id: inv.restaurant_id, user_id: app.account.id, name: newName.trim(), base_unit: newBase,
        supplier_code: line.product_code, pack_count: line.pack_count, pack_size: line.pack_size, pack_unit: line.pack_unit,
      } });
      setIngredients(old => [...old, created]); changeLine(line.id, { ingredient_id: created.id, match_status: 'confirmed', match_reason: 'New ingredient created from this line' }); setNewFor(null);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function addLine() {
    setBusy(true); setError(null);
    try {
      const [created] = await rows<InvLine>({ table: 'invoice_lines', operation: 'insert', payload: { invoice_id: inv.id, restaurant_id: inv.restaurant_id, position: lines.length, description: 'New line' } });
      setLines(old => [...old, created]); setEdits(old => ({ ...old, [created.id]: draft(created) })); setDirty(true);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function removeLine(line: InvLine) {
    if (!await confirmAction('Remove this line?', 'The line and its unsaved edits will be removed.')) return;
    setBusy(true); setError(null);
    try {
      await rows({ table: 'invoice_lines', operation: 'delete', filters: [eq('id', line.id)] });
      setLines(old => old.filter(l => l.id !== line.id)); setDirty(true);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  async function removeInvoice() {
    if (!deleted && !await confirmAction('Delete this invoice?', 'This deletes the invoice and its uploaded documents. This cannot be undone.')) return;
    setBusy(true); setError(null);
    try {
      // Delete the invoice under its server lock first. A concurrent approval
      // must win before any bytes can be removed. Keep cleanup retryable if the
      // storage service is temporarily unavailable.
      if (!deleted) {
        await rows({ table: 'invoices', operation: 'delete', filters: [eq('id', inv.id)] });
        setDeleted(true); await app.refresh();
      }
      if (inv.file_paths.length) await removeDocuments({ paths: inv.file_paths });
      onClose();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  if (deleted) return <Screen><Title>Invoice deleted</Title><Txt>Finishing private document cleanup.</Txt><Notice error={error} /><Button title="Retry document cleanup" loading={busy} onPress={() => void removeInvoice()} /></Screen>;
  if (!canManage) return <Screen><Button title="Invoice archive" secondary onPress={onClose} /><Txt>An owner or manager must review and approve this invoice.</Txt></Screen>;
  return <Screen refreshing={loading} onRefresh={busy ? undefined : () => void reload()}>
    <Button title="Invoice archive" secondary disabled={busy} onPress={() => void (async () => {
      if (!dirty || await confirmAction('Discard unsaved edits?', 'Save your review before leaving if you want to keep these changes.')) onClose();
    })()} />
    <Title eyebrow={STATUS_LABEL[inv.status] || inv.status}>{inv.vendor_name || 'Supplier invoice'}</Title>
    <Notice error={error} retry={busy ? undefined : () => void reload()} />
    {!!success && <Txt bold>{success}</Txt>}
    {loading && <Loading />}
    {!!inv.extraction_error && <Card><Txt>{inv.extraction_error}</Txt><Txt muted>Retry reading, or enter and save details manually.</Txt></Card>}
    {duplicates.length > 0 && <Card><Txt bold>Possible duplicate</Txt>{duplicates.map(i => <Txt key={i.id}>{i.vendor_name} #{i.invoice_number || '?'} · {i.status}</Txt>)}<Txt muted>Check before approving a second purchase.</Txt></Card>}
    <Card><Txt bold>Original document</Txt><Notice error={documentError} retry={() => void loadDocuments()} />
      {documents.map((source, index) => <Image key={source.uri} source={Platform.OS === 'web' ? { uri: source.uri } : source} accessibilityLabel={`Invoice page ${index + 1}`} resizeMode="contain" style={styles.document}
        onError={() => setDocumentError(new Error('Unable to display the private photo. Retry to refresh document authorization.'))} />)}
      {inv.file_paths.some(p => p.endsWith('.pdf')) && <Txt muted>PDF documents can be extracted and reviewed here. View the original PDF in the signed-in website archive.</Txt>}
      {!inv.file_paths.length && <Txt muted>No original document attached.</Txt>}
    </Card>
    {!locked && <Button title={lines.length ? 'Re-read document' : 'Extract invoice'} icon="file-text" loading={extractMutation.isPending} disabled={!editable} onPress={() => void extract()} />}
    {inv.status === 'extracting' && <Card><Txt>Reading is in progress. Reload to check the result. If reading was interrupted, retry after five minutes.</Txt><Button title="Retry interrupted extraction" secondary disabled={busy} onPress={() => void extract()} /></Card>}
    <Card><Txt bold>Invoice details</Txt>
      {headerText.map(k => <Field key={k} label={`${labels[k]}${inv.uncertain_fields.includes(k) ? ' · check original' : ''}`} value={header[k] || ''} editable={editable} onChangeText={v => changeHeader(k, v)} autoCapitalize={k === 'invoice_date' ? 'none' : 'sentences'} />)}
      <Txt bold>Document type</Txt><View style={styles.choices}>{Object.entries(DOC_LABEL).map(([k, label]) => <Button key={k} title={`${header.doc_type === k ? 'Selected: ' : ''}${label}`} secondary={header.doc_type !== k} disabled={!editable} onPress={() => changeHeader('doc_type', k)} />)}</View>
      {header.doc_type !== 'invoice' && <>
        <Txt bold>Related invoice</Txt><Button title="No related invoice" secondary disabled={!editable} onPress={() => changeHeader('corrects_invoice_id', '')} />
        {app.workspace.invoices.filter(i => i.restaurant_id === inv.restaurant_id && i.id !== inv.id).map(i => <Row key={i.id} title={`${header.corrects_invoice_id === i.id ? 'Selected: ' : ''}${i.vendor_name || 'Invoice'} #${i.invoice_number || '?'}`} onPress={editable ? () => changeHeader('corrects_invoice_id', i.id) : undefined} />)}
        <Txt muted>Credits and returns are archived without changing ingredient prices.</Txt>
      </>}
      {!!locations.length && <><Txt bold>Location</Txt><Button title="No location" secondary disabled={!editable} onPress={() => changeHeader('location_id', '')} />{locations.map(l => <Row key={l.id} title={`${header.location_id === l.id ? 'Selected: ' : ''}${l.name}`} onPress={editable ? () => changeHeader('location_id', l.id) : undefined} />)}</>}
      {headerNumbers.map(k => <Field key={k} label={`${labels[k]}${inv.uncertain_fields.includes(k) ? ' · check original' : ''}`} value={header[k] || ''} editable={editable} onChangeText={v => changeHeader(k, v)} keyboardType="decimal-pad" />)}
    </Card>
    {validation && <Card><Txt bold>{validation.issues.length ? 'Totals need attention' : 'Totals reconcile'}</Txt>{validation.issues.map(issue => <Txt key={issue} size={13}>{issue}</Txt>)}<Txt muted size={12}>Line sum: {money(validation.sumLines)} · Calculated total: {money(validation.computed)}</Txt></Card>}
    <Txt bold size={22}>Line items</Txt>
    {lines.map(l => {
      const e = edits[l.id] || draft(l), parsed = previewLines.find(p => p.id === l.id) || l;
      const ing = ingredients.find(i => i.id === e.ingredient_id), conv = ing && e.match_status !== 'nonfood' ? lineUnitCost(parsed, ing) : null;
      return <Card key={l.id}>
        <Field label="Description" value={e.description} editable={editable} onChangeText={v => changeLine(l.id, { description: v })} />
        <Field label="Supplier product code" value={e.product_code} editable={editable} onChangeText={v => changeLine(l.id, { product_code: v })} />
        {lineNumbers.map(k => <Field key={k} label={labels[k]} value={e[k] || ''} keyboardType="decimal-pad" editable={editable} onChangeText={v => changeLine(l.id, { [k]: v })} />)}
        <Txt bold>Pack unit: {e.pack_unit || 'Missing'}</Txt>
        {editable && <View style={styles.choices}>{UNIT_LIST.map(u => <Button key={u} title={UNITS[u].label} secondary={e.pack_unit !== u} onPress={() => changeLine(l.id, { pack_unit: u })} />)}</View>}
        {l.uncertain && <Txt size={13}>Check original: {l.uncertain_note || 'AI was unsure about this line.'}</Txt>}
        <Txt bold>{e.match_status === 'nonfood' ? 'Non-food expense' : `${e.match_status}: ${ing?.name || 'No ingredient'}`}</Txt>
        {!!l.match_confidence && e.match_status === 'suggested' && <Txt muted>{Math.round(l.match_confidence * 100)}% confidence — confirmation required</Txt>}
        {!!e.match_reason && <Txt muted size={12}>{e.match_reason}</Txt>}
        {conv && <Txt size={13}>{conv.ok ? conv.explain : `Conversion needed: ${conv.reason}`}</Txt>}
        {editable && <>
          {e.match_status === 'suggested' && <Button title="Confirm suggested match" onPress={() => changeLine(l.id, { match_status: 'confirmed' })} />}
          <Button title="Choose ingredient" secondary onPress={() => { setChooseFor(chooseFor === l.id ? null : l.id); setSearch(''); }} />
          {chooseFor === l.id && <><Field label="Find ingredient" value={search} onChangeText={setSearch} />{ingredients.filter(i => `${i.name} ${i.brand || ''}`.toLowerCase().includes(search.toLowerCase())).map(i => <Row key={i.id} title={i.name} subtitle={i.brand || i.base_unit} onPress={() => {
            changeLine(l.id, { ingredient_id: i.id, match_status: 'confirmed', match_reason: 'Chosen manually' }); setChooseFor(null);
          }} />)}{!ingredients.length && <Txt muted>No restaurant ingredients yet. Create one below.</Txt>}</>}
          <Button title="Create ingredient from line" secondary onPress={() => { setNewFor(l); setNewName(e.description); setNewBase(isUnit(e.pack_unit) ? UNITS[e.pack_unit].dim === 'volume' ? 'ml' : UNITS[e.pack_unit].dim === 'count' ? 'each' : 'g' : 'g'); }} />
          {newFor?.id === l.id && <><Field label="New ingredient name" value={newName} onChangeText={setNewName} /><View style={styles.choices}>{['g', 'ml', 'each'].map(b => <Button key={b} title={b} secondary={newBase !== b} onPress={() => setNewBase(b)} />)}</View><Button title="Create and match" onPress={() => void createIngredient()} /><Button title="Cancel new ingredient" secondary onPress={() => setNewFor(null)} /></>}
          <Button title="Mark as non-food" secondary onPress={() => changeLine(l.id, { ingredient_id: '', match_status: 'nonfood', match_reason: '' })} />
          <Button title="Clear match" secondary onPress={() => changeLine(l.id, { ingredient_id: '', match_status: 'unmatched', match_reason: '' })} />
          <Button title="Remove line" danger onPress={() => void removeLine(l)} />
        </>}
      </Card>;
    })}
    {!lines.length && !loading && <Txt muted>No extracted lines yet. Read the document or add lines manually.</Txt>}
    {!locked && <><Button title="Add invoice line" secondary disabled={!editable} onPress={() => void addLine()} /><Button title={dirty ? 'Save review changes' : 'Save review'} disabled={!editable} onPress={() => void save()} /><Button title="Approve and update prices" icon="check-circle" loading={approveMutation.isPending} disabled={!editable || !lines.length} onPress={() => void approve()} /><Button title="Delete invoice" danger disabled={!editable} onPress={() => void removeInvoice()} /></>}
    {busy && <Loading />}
    {result && <Card><Txt bold>Approval result</Txt>{result.changes.length ? result.changes.map(change => <Txt key={change.ingredient_id}>
      {ingredients.find(i => i.id === change.ingredient_id)?.name || 'Ingredient'}: {change.prev == null ? 'No previous price' : `$${change.prev.toFixed(5)}`} → {change.next == null ? '—' : `$${change.next.toFixed(5)}`} / {ingredients.find(i => i.id === change.ingredient_id)?.base_unit}
      {!change.becameCurrent ? ' · a newer invoice still sets the current cost' : ''}
    </Txt>) : <Txt>No ingredient prices changed.</Txt>}</Card>}
  </Screen>;
}
const styles = StyleSheet.create({ document: { width: '100%', height: 360 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } });
