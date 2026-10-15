import { useState } from 'react';
import { Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { completeUpload, requestUploadUrl } from '@workspace/api-client-react';
import { InvoiceReview } from '@/components/InvoiceReview';
import { Back, Button, Empty, Loading, Notice, Row, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
import { money, rows, type Invoice } from '@/lib/domain';

export default function Invoices() {
  const app = useAppState(); const [busy, setBusy] = useState(false); const [error, setError] = useState<unknown>(null);
  const [blocked, setBlocked] = useState(false); const [success, setSuccess] = useState('');
  const [selected, setSelected] = useState<Invoice | null>(null);
  async function capture(camera: boolean) {
    if (!app.restaurant || !app.account) return;
    setBusy(true); setError(null); setSuccess('');
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setBlocked(!permission.canAskAgain);
          throw new Error('Camera access is needed to photograph an invoice. You can also choose a photo instead.');
        }
      }
      const picked = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: .85 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: .85 });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const type = asset.mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('Choose a JPG, PNG, or WEBP image. You can take a new photo to convert a HEIC image.');
      const body = Platform.OS === 'web' ? await (await fetch(asset.uri)).blob() : new File(asset.uri);
      const size = body.size;
      if (!size || size > 20 * 1024 * 1024) throw new Error('Choose an image smaller than 20 MB.');
      const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
      const filename = `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
      const logicalPath = `${app.restaurant.id}/${filename}`;
      const destination = await requestUploadUrl({ logicalPath, name: filename, size, contentType: type as 'image/jpeg' | 'image/png' | 'image/webp' });
      const uploaded = await expoFetch(destination.uploadURL, { method: 'PUT', headers: { 'Content-Type': type }, body });
      if (!uploaded.ok) throw new Error('The image could not be uploaded. Please try again.');
      await completeUpload({ path: logicalPath });
      const [invoice] = await rows<Invoice>({ table: 'invoices', operation: 'insert', payload: { restaurant_id: app.restaurant.id, uploaded_by: app.account.id, file_paths: [logicalPath], status: 'uploaded' } });
      await app.refresh(); setSuccess('Invoice captured securely. An owner or manager can now extract, review, and approve it here.');
      if (app.canManage) setSelected(invoice);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }
  const invoices = app.workspace.invoices.filter(i => i.restaurant_id === app.restaurant?.id);
  if (selected && app.restaurant?.id === selected.restaurant_id) return <InvoiceReview key={`${app.account?.id}:${selected.id}`} invoice={selected} onClose={() => setSelected(null)} />;
  return <Screen refreshing={app.busy} onRefresh={() => void app.refresh()}><Back /><Title eyebrow="From supplier to kitchen">Invoices</Title><Notice error={error} />{!!success && <Txt bold size={13}>{success}</Txt>}
    {!app.restaurant ? <Button title="Open kitchen" onPress={() => router.replace('/(tabs)/kitchen')} /> : <>
      <Button title="Photograph invoice" icon="camera" loading={busy} onPress={() => void capture(true)} />
      <Button title="Choose an invoice photo" secondary icon="image" disabled={busy} onPress={() => void capture(false)} />
      {blocked && Platform.OS !== 'web' && <Button title="Open camera settings" secondary onPress={() => void Linking.openSettings().catch(setError)} />}
      <Txt muted size={12}>Private document storage. Uploading never changes prices. {app.canManage ? 'Tap an invoice to extract, match, validate, and approve it.' : 'Staff capture invoices; an owner or manager handles review and approval.'}</Txt>
      {busy && <Loading />}
      {invoices.length ? invoices.map(i => <Row key={i.id} title={i.vendor_name || i.invoice_number || 'Supplier invoice'} subtitle={`${i.status} · ${new Date(i.created_at).toLocaleDateString()}`} trailing={money(i.total)} onPress={app.canManage ? () => setSelected(i) : undefined} />) : <Empty title="No invoices yet" text="Take a clear photo of a supplier invoice. It will appear here and on the website." />}
    </>}
  </Screen>;
}
