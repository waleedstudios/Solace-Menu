import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth, useSignIn, useSignUp, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import { Back, Brand, Button, Field, Notice, Screen, Title, Txt } from '@/components/ui';

WebBrowser.maybeCompleteAuthSession();
export default function SignIn() {
  const { isSignedIn, isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'password' | 'signup-code' | 'email-code' | 'mfa'>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => { if (isSignedIn) router.replace('/(tabs)/kitchen'); }, [isSignedIn]);
  async function run(action: () => Promise<void>) { setBusy(true); setError(null); try { await action(); } catch (e) { setError(e); } finally { setBusy(false); } }
  async function finish() {
    if (signIn.status === 'complete') {
      const result = await signIn.finalize({ navigate: ({ session }) => {
        if (session?.currentTask) setError(new Error('Your account needs additional verification. Complete it on the website, then sign in here.'));
        else router.replace('/(tabs)/kitchen');
      } });
      if (result.error) throw result.error;
    } else if (signIn.status === 'needs_client_trust' || signIn.status === 'needs_second_factor') {
      const factor = signIn.supportedSecondFactors?.find(f => f.strategy === 'email_code');
      if (factor) { const result = await signIn.mfa.sendEmailCode(); if (result.error) throw result.error; }
      setStep('mfa');
    } else throw new Error('Additional verification is required. Check your account settings on the website.');
  }
  async function submit() {
    if (step === 'signup-code') {
      const result = await signUp.verifications.verifyEmailCode({ code });
      if (result.error) throw result.error;
      if (signUp.status !== 'complete') throw new Error('Your account needs additional details before it can be created.');
      const finalized = await signUp.finalize({ navigate: () => router.replace('/(tabs)/kitchen') });
      if (finalized.error) throw finalized.error;
    } else if (step === 'email-code') {
      const result = await signIn.emailCode.verifyCode({ code });
      if (result.error) throw result.error;
      await finish();
    } else if (step === 'mfa') {
      const emailFactor = signIn.supportedSecondFactors?.some(f => f.strategy === 'email_code');
      const result = emailFactor ? await signIn.mfa.verifyEmailCode({ code }) : await signIn.mfa.verifyTOTP({ code });
      if (result.error) throw result.error;
      await finish();
    } else if (register) {
      const result = await signUp.password({ emailAddress: email.trim(), password });
      if (result.error) throw result.error;
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) throw sent.error;
      setStep('signup-code');
    } else {
      const result = await signIn.password({ emailAddress: email.trim(), password });
      if (result.error) throw result.error;
      await finish();
    }
  }
  async function sso(strategy: 'oauth_google' | 'oauth_apple') {
    const result = await startSSOFlow({ strategy, redirectUrl: AuthSession.makeRedirectUri({ scheme: 'solace-mobile', path: 'sso-callback' }) });
    if (result.createdSessionId && result.setActive) {
      await result.setActive({ session: result.createdSessionId });
      router.replace('/(tabs)/kitchen');
    } else if (result.signIn || result.signUp) throw new Error('Additional account verification is needed. Use email sign-in or complete your account on the website.');
  }
  const socialEnabled = process.env.EXPO_PUBLIC_SOCIAL_SIGN_IN_ENABLED === 'true';
  return <Screen><Back /><Brand /><Title eyebrow="For your restaurant">{step !== 'password' ? 'Verify it’s you' : register ? 'Start with your account.' : 'Back to your kitchen.'}</Title>
    <Txt muted>{step !== 'password' ? 'Enter your email verification code or authenticator code.' : 'Your website account, recipes, and costs—all in one place.'}</Txt>
    <Notice error={error} />
    {step === 'password' ? <>
      <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={register ? 'new-password' : 'current-password'} />
    </> : <Field label="Verification code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" />}
    <Button title={step !== 'password' ? 'Verify & continue' : register ? 'Create account' : 'Sign in'} onPress={() => void run(submit)} loading={busy} disabled={!isLoaded || (step === 'password' ? !email || !password : !code)} testID="submit-sign-in" />
    {step === 'password' && !register && <Button title="Email me a sign-in code" secondary disabled={!email || busy || !isLoaded} onPress={() => void run(async () => {
      const result = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
      if (result.error) throw result.error;
      setStep('email-code');
    })} />}
    {step === 'password' && <>
      {(__DEV__ || socialEnabled) && <Button title="Continue with Google" secondary loading={busy} onPress={() => void run(() => sso('oauth_google'))} />}
      {socialEnabled && <Button title="Continue with Apple" secondary loading={busy} onPress={() => void run(() => sso('oauth_apple'))} />}
      <Button title={register ? 'Already have an account? Sign in' : 'New restaurant? Create account'} secondary disabled={busy} onPress={() => { setRegister(!register); setError(null); }} />
    </>}
    {step !== 'password' && <Button title="Start over" secondary onPress={() => { void run(async () => { await signIn.reset(); await signUp.reset(); setCode(''); setStep('password'); }); }} disabled={busy} />}
    <View nativeID="clerk-captcha" />
    <Txt muted size={11}>Customers don’t need an account to browse or save menus.</Txt>
  </Screen>;
}
