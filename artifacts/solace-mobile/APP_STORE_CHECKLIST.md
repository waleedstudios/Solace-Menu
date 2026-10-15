# SolaceMenu iPhone release checklist

## Implemented

- Separate Expo native app for customers and restaurant teams. The website is preserved.
- Guest restaurant discovery, published menu browsing, saved menus, QR scanning, and sharing.
- Restaurant sign-in, real business onboarding, role-gated recipe/ingredient tools, saved per-serving nutrition and food costs, and public-menu visibility controls.
- Same API, database, recipe engine, and automatic recipe-to-public-menu behavior as the website. Hidden existing dishes remain hidden; sub-recipes are private.
- Private invoice photo capture/upload. Detailed invoice extraction, matching, and approval open the existing website review, which may require a separate web sign-in.
- In-app account-deletion initiation with typed confirmation, recent-session verification, immediate access/publication removal, and durable retries across local/provider/storage cleanup. Final deletion waits 20 minutes for previously issued upload links to expire.
- Supplied SolaceMenu branding, opaque 1024px icon, camera/photo permission explanations, secure native session-token storage.

## Required before submission

1. **Publisher identity:** confirm the Apple Developer account, legal/business name, support email and URL, ownership of the brand, and the initial bundle identifier `com.solacemenu.mobile` before registering the first store build. Do not change an identifier after registration.
2. **Production services:** publish the shared API/database/storage and native mobile artifact through Replit's publishing flow. Do not ship a development-domain backend or development Clerk keys. The build script receives `EXPO_PUBLIC_DOMAIN`; native builds use that origin rather than a hardcoded host.
3. **Authentication:** configure production Clerk, its allowed domains/redirects, and the app's `solace-mobile://sso-callback` redirect. Production builds default to email/password and email code. Google is available in development; production Google and Apple buttons are both gated by `EXPO_PUBLIC_SOCIAL_SIGN_IN_ENABLED=true`. Only enable that flag after both native providers and their Apple/Google app credentials are configured and verified on-device. Managed Clerk settings may require the applicable Replit dashboard-access plan.
4. **Privacy/legal:** review the in-app privacy description, add the actual operator and support/privacy contact, publish a public privacy-policy URL, and complete Apple App Privacy disclosures for account data, restaurant data, invoice documents and camera/photo use. Review provider contracts, retention/backups, and deletion obligations. Do not claim deletion instantly removes historical backups outside application control.
5. **Content and nutrition:** review restaurant-published content moderation/reporting requirements, menu ownership permissions, nutrition-estimate wording, allergen disclaimers, and applicable local rules. The app is not medical advice.
6. **Physical iPhone / TestFlight:** verify native email sign-in and session restoration, onboarding, role-specific permissions, recipe/ingredient updates, public visibility sync, offline/error recovery, camera/gallery permissions including denied states, QR scanning, sharing, and the complete deletion flow with a disposable real Clerk test account. Browser preview cannot validate native camera, OAuth callbacks, secure storage, or provider-side deletion.
7. **Store listing:** prepare iPhone screenshots, description, age rating, review notes and a disposable reviewer business account with representative data. List the actual shipped features; do not describe web-only invoice approvals, sales analytics or team administration as native screens.
8. **Review:** use the Replit mobile publishing workflow to prepare a store build, test with TestFlight, then submit through App Store Connect. Apple approval is a separate review, not automatic.

## Verification commands

```sh
pnpm run typecheck
cd artifacts/solace-mobile
CI=1 pnpm exec expo install --check
pnpm dlx expo-doctor@latest
```

The SDK's compatible native-module versions take precedence over examples written for older SDKs. No EAS CLI setup is needed for the Replit publishing flow.
