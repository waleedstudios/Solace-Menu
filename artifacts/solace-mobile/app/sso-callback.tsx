import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { Button, Loading, Screen, Txt } from '@/components/ui';
export default function Callback() {
  const { isSignedIn, isLoaded } = useAuth();
  useEffect(() => { if (isSignedIn) router.replace('/(tabs)/kitchen'); }, [isSignedIn]);
  return <Screen>{!isLoaded ? <Loading /> : <><Txt>Return to sign-in to finish connecting your account.</Txt><Button title="Return to sign in" onPress={() => router.replace('/sign-in')} /></>}</Screen>;
}
