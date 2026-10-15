import { useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { Back, Button, Field, Notice, Screen, Title, Txt } from '@/components/ui';
import { menuSlug } from '@/lib/domain';
export default function Scan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false); const [input, setInput] = useState(''); const [error, setError] = useState<unknown>(null);
  function open(value: string) {
    const slug = menuSlug(value);
    if (!slug) { setError(new Error('This is not a SolaceMenu menu link. Scan a restaurant menu QR code.')); setScanned(true); return; }
    setScanned(true); router.replace({ pathname: '/menu/[slug]', params: { slug } });
  }
  return <Screen><Back /><Title eyebrow="Straight to the menu">Scan. Browse. Know.</Title><Notice error={error} />
    {permission?.granted ? <View style={{ height: 330, overflow: 'hidden', borderRadius: 20 }}><CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={scanned ? undefined : result => open(result.data)} /></View> : <>
      <Txt muted>Point your camera at a restaurant’s SolaceMenu QR code. Camera access is only used while this screen is open.</Txt>
      {!permission?.canAskAgain && permission?.status === 'denied' && Platform.OS !== 'web' ? <Button title="Open camera settings" onPress={() => void Linking.openSettings().catch(setError)} /> : <Button title="Allow camera access" onPress={() => void requestPermission().catch(setError)} />}
    </>}
    {scanned && <Button title="Scan again" secondary onPress={() => { setScanned(false); setError(null); }} />}
    <Field label="Or paste a menu link" value={input} onChangeText={setInput} autoCapitalize="none" placeholder="Restaurant menu link or slug" />
    <Button title="Open menu" secondary disabled={!input.trim()} onPress={() => open(input)} />
  </Screen>;
}
