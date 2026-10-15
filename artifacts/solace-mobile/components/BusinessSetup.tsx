import { useState } from 'react';
import { useUser } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useCompleteBusinessOnboarding } from '@workspace/api-client-react';
import { Button, Field, Notice, Title, Txt } from './ui';
export function BusinessSetup() {
  const { user } = useUser(); const client = useQueryClient();
  const [name, setName] = useState(user?.fullName || '');
  const [business, setBusiness] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<unknown>(null);
  const mutation = useCompleteBusinessOnboarding();
  async function submit() {
    setError(null);
    if (name.trim().length < 2 || business.trim().length < 2 || address.trim().length < 5 || phone.replace(/\D/g, '').length < 7) {
      setError(new Error('Enter your name, business name, full store address, and a valid business phone number.')); return;
    }
    try {
      await mutation.mutateAsync({ data: { full_name: name.trim(), email: user?.primaryEmailAddress?.emailAddress || '', business_name: business.trim(), business_address: address.trim(), business_phone: phone.trim() } });
      await client.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('/api/me') });
    } catch (e) { setError(e); }
  }
  return <><Title eyebrow="Make it yours">Tell us about{'\n'}your business.</Title><Txt muted>These details set up your restaurant. We never name it after your Google profile.</Txt>
    <Field label="Your full name" value={name} onChangeText={setName} autoComplete="name" />
    <Field label="Business name" value={business} onChangeText={setBusiness} />
    <Field label="Store address" value={address} onChangeText={setAddress} autoComplete="street-address" />
    <Field label="Business phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
    <Notice error={error} /><Button title="Create my restaurant" onPress={() => void submit()} loading={mutation.isPending} />
  </>;
}
