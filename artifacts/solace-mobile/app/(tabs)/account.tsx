import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth, useClerk } from '@clerk/expo';
import { useDeleteAccount } from '@workspace/api-client-react';
import { Brand, Button, Card, Field, Notice, Row, Screen, Title, Txt } from '@/components/ui';
import { useAppState } from '@/providers/AppState';
export default function Account() {
  const { isSignedIn } = useAuth(); const { signOut } = useClerk(); const app = useAppState();
  const deletion = useDeleteAccount();
  const [confirming, setConfirming] = useState(false); const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<unknown>(null); const [status, setStatus] = useState('');
  async function remove() {
    setError(null);
    try {
      const result = await deletion.mutateAsync({ data: { confirmation: 'DELETE' } });
      setStatus(result.status === 'pending' ? 'Your deletion request is saved. Access is locked and public menus are removed. Permanent removal starts after a 20-minute upload safety window; service interruptions may delay completion.' : 'Your account and owned businesses have been permanently deleted.');
      await signOut(); setConfirming(false);
    } catch (e) { setError(e); }
  }
  return <Screen><Brand /><Title eyebrow="Your space">Account & privacy</Title><Notice error={error} />{!!status && <Card><Txt>{status}</Txt></Card>}
    {isSignedIn ? <><Card><Txt bold size={20}>{app.account?.full_name || 'Your account'}</Txt><Txt muted>{app.account?.email}</Txt>{app.restaurant && <Txt size={13}>{app.restaurant.name} · {app.role}</Txt>}</Card><Button title="Sign out" secondary icon="log-out" onPress={() => void signOut().then(() => router.replace('/')).catch(setError)} /></> : <><Txt muted>Browse and save menus without creating an account. Restaurant teams can sign in to manage their business.</Txt><Button title="Restaurant sign in" onPress={() => router.push('/sign-in')} /></>}
    <Row title="Privacy & data" subtitle="How SolaceMenu handles information" onPress={() => router.push('/privacy')} />
    <Row title="Nutrition information" subtitle="Restaurant-provided values, estimates, and allergens" onPress={() => router.push('/privacy')} />
    <Row title="Clear saved menus on this device" subtitle="Does not change restaurant data" icon="trash-2" onPress={() => void app.clearSaved().then(() => { setStatus('Saved menus cleared from this device.'); }).catch(setError)} />
    {isSignedIn && (!confirming ? <Button title="Delete my account" danger secondary onPress={() => setConfirming(true)} /> : <Card><Txt bold size={19}>Permanently delete your account?</Txt><Txt>This deletes your sign-in, all businesses you own, recipes, menus, invoices, and stored documents. Your team will lose access to those businesses. This cannot be undone.</Txt><Txt muted size={12}>Records belonging to other restaurants you work for remain with those businesses. Sign in within the last 10 minutes to confirm deletion.</Txt><Field label="Type DELETE to confirm" value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" /><Button title="Permanently delete account" danger loading={deletion.isPending} disabled={confirmation !== 'DELETE'} onPress={() => void remove()} /><Button title="Keep my account" secondary disabled={deletion.isPending} onPress={() => setConfirming(false)} /></Card>)}
    <Txt muted size={11}>SolaceMenu · Version 1.0.0</Txt>
  </Screen>;
}
