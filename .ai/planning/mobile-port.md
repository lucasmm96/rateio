# Publicar o Rateio na Google Play Store (Capacitor 8, Android)

## Contexto

O app é um SPA React 19 + Vite 8 (PWA) publicado em `https://meurateio.vercel.app/`, com autenticação Neon Auth (Better Auth) e dados via Neon Data API. O objetivo é distribuir o app na Play Store como aplicativo Android nativo, reutilizando o código existente.

Decisões já tomadas com o usuário:

| Item | Decisão |
|------|---------|
| Modo Android | **Remote URL**: o WebView carrega o site da Vercel (origem first-party, cookie do Neon Auth continua funcionando) |
| Login Google | **Deve funcionar na v1** |
| Package name | `io.github.lucasmm96.rateio` (permanente) |
| Nome de exibição | `Meu Rateio` |
| Conta Play Console | Ainda não existe; será **pessoal (CPF)** |
| Target SDK | 36 (obrigatório para novos apps desde 31/08/2026) → **Capacitor 8.x** |

### Descobertas técnicas que definem a arquitetura

1. **OAuth Google não pode ser feito por deep link com handoff de sessão.** Verifiquei `node_modules/@neondatabase/auth/node_modules/better-auth/dist/api/routes/callback.mjs:199-210`: o callback do Neon grava o cookie **no host do Neon Auth** e redireciona para o `callbackURL`. O WebView não compartilha o cookie jar do navegador do sistema, então voltar por `custom scheme` não autentica o app. Não existe "session verifier" no Better Auth.
2. **Better Auth suporta login social por ID token**: `sign-in.mjs:60-90` aceita `idToken: { token }` para Google (`:154-193`). Esse é o caminho correto: Google Sign-In nativo gera o ID token; o WebView troca por sessão.
3. **Cookies do Neon Auth serão third-party no WebView** (origem `https://meurateio.vercel.app`, auth em `*.neon.tech`). O Android WebView bloqueia third-party cookies por padrão; é obrigatório habilitar em `MainActivity.java`, senão login por e-mail/senha e persistência de sessão falham.
4. Service worker do site roda normalmente no WebView (modo remote). O reload em `src/main.tsx:23-37` pode interromper formulários; será limitado ao web.

---

## Fase 0 — Pré-requisitos (fora do código)

1. Criar conta em `play.google.com/console` (taxa única US$ 25), verificar identidade.
   - Conta pessoal nova: regra de **teste fechado com 12 testadores por 14 dias contínuos** antes de solicitar produção. Confirmar a regra vigente no console ao criar a conta.
2. Instalar Android Studio com JDK 21, SDK Platform 36, Build-Tools 36.x, Platform-Tools e Emulator.
3. Confirmar `Deployment Protection` da Vercel **desligada** em produção (senão o WebView abre a tela de login da Vercel).
4. Criar uma **conta demo** com dados de exemplo (o revisor da Play não pode depender de Google OAuth).

---

## Fase 1 — Setup Capacitor

### 1.1 Dependências

```powershell
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/app@^8 `
  @capacitor/browser@^8 @capacitor/filesystem@^8 @capacitor/share@^8 `
  @capacitor/status-bar@^8 @capacitor/splash-screen@^8
npm install -D @capacitor/cli@^8 @capacitor/assets@^4
```

Plugin de Google Sign-In (escolher um mantido e compatível com Capacitor 8 na hora da instalação):
`@capgo/capacitor-social-login` **ou** `@capawesome/capacitor-google-sign-in`. Validar suporte a Capacitor 8 antes de fixar.

### 1.2 Projeto Android

```powershell
npx cap init "Meu Rateio" io.github.lucasmm96.rateio --web-dir dist
npx cap add android
```

### 1.3 `capacitor.config.ts` (novo, raiz)

```ts
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.lucasmm96.rateio',
  appName: 'Meu Rateio',
  webDir: 'dist',
  server: {
    url: 'https://meurateio.vercel.app',
    cleartext: false,
    androidScheme: 'https',
    errorPath: 'offline.html',        // página local quando não há rede
    allowNavigation: ['meurateio.vercel.app'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: { style: 'DARK', overlaysWebView: true },
  },
}

export default config
```

Incluir `capacitor.config.ts` no `include` de `tsconfig.node.json`.

### 1.4 Scripts em `package.json`

```json
"android:sync": "npm run build && cap sync android",
"android:open": "cap open android",
"android:run": "npm run build && cap sync android && cap run android",
"android:bundle": "npm run build && cap sync android && cd android && gradlew.bat bundleRelease"
```

### 1.5 SDK 36

Em `android/variables.gradle`: `minSdkVersion = 24`, `compileSdkVersion = 36`, `targetSdkVersion = 36`.
Em `android/app/build.gradle`: `namespace` e `applicationId` = `io.github.lucasmm96.rateio`, `versionCode 1`, `versionName "1.0.0"`.

---

## Fase 2 — Ajustes de código para o nativo

### 2.1 Google Sign-In nativo + troca por ID token

**`src/db/auth.ts`** — novo caminho nativo:

```ts
import { Capacitor } from '@capacitor/core'

export async function signInWithGoogle() {
  if (Capacitor.isNativePlatform()) {
    // plugin escolhido na Fase 1.1
    const result = await GoogleSignIn.signIn({ serverClientId: '<WEB_CLIENT_ID>' })
    return neon.auth.signIn.social({
      provider: 'google',
      idToken: { token: result.idToken },
    })
  }
  return neon.auth.signIn.social({
    provider: 'google',
    callbackURL: import.meta.env.BASE_URL,
  })
}
```

- O ID token tem `aud` = **Web client ID** (passado como `serverClientId`), que é o mesmo client já configurado no Neon Auth/Google Cloud. Isso faz a verificação no servidor casar.
- O POST de `signIn.social` sai do WebView para o Neon Auth e grava o cookie de sessão no WebView.
- Ajustar `src/components/ui/GoogleButton.tsx` (se existir) e `src/routes/Login.tsx`/`Cadastro.tsx` para usar `finally` no loading, pois o fluxo nativo abre UI externa.
- **Spike obrigatório antes de seguir**: testar em dispositivo real (build de release) o ciclo completo `GoogleSignIn.signIn` → `signIn.social(idToken)` → `useUser()` → matar/reabrir app com sessão ativa. Se o Neon Auth hospedado rejeitar o branch de `idToken`, o fallback é esconder Google no Android na v1 e tratar como item bloqueante com o suporte do Neon.

### 2.2 Cookies third-party no WebView

**`android/app/src/main/java/io/github/lucasmm96/rateio/MainActivity.java`** — após `super.onCreate`:

```java
import android.webkit.CookieManager;

CookieManager.getInstance().setAcceptThirdPartyCookies(getBridge().getWebView(), true);
```

Sem isso, `getSession()` não envia o cookie para `*.neon.tech` e o app fica preso em `/login`.
Fallback caso o cookie ainda falhe: proxy same-origin do auth via `vercel.json` (`/api/auth/*` → Neon Auth) e `VITE_NEON_AUTH_URL` apontando para o domínio próprio.

### 2.3 Exportação XLSX

**`src/lib/baixar-xlsx.ts`** — branch nativo com `Filesystem` + `Share`:

```ts
if (Capacitor.isNativePlatform()) {
  const { uri } = await Filesystem.writeFile({
    path: nomeArquivo,
    data: toBase64(buffer as ArrayBuffer),
    directory: Directory.Cache,
  })
  await Share.share({ title: nomeArquivo, dialogTitle: 'Compartilhar planilha', files: [uri] })
  return
}
```

Manter o caminho web atual (blob + `<a download>`). Chamador em `src/routes/DetalheRateio.tsx:737-752` não muda.

### 2.4 Links externos

Novo `src/lib/links-externos.ts` com `Browser.open({ url })` quando `Capacitor.isNativePlatform()`. Aplicar em:
- `src/components/LinksList.tsx:117-124`
- `src/routes/Configuracoes.tsx:151-159` e `:291-299`

### 2.5 Botão voltar físico e bootstrap nativo

Novo `src/lib/native.ts`, chamado em `src/main.tsx`:

- `App.addListener('backButton')`: `history.state.idx > 0` → `history.back()`; rota ≠ `/` → `replace('/')`; raiz → `App.exitApp()`.
- `SplashScreen.hide()` e `StatusBar.setOverlaysWebView({ overlay: true })`.
- Sincronizar `StatusBar.setStyle` com o tema em `src/components/ThemeProvider.tsx` (dark → `Style.Light`, light → `Style.Dark`).

### 2.6 Safe area

Em `src/styles/globals.css`, adicionar utilitários reais:

```css
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pb-safe-6 { padding-bottom: calc(1.5rem + env(safe-area-inset-bottom)); }
```

Aplicar:
- `src/components/ui/Header.tsx:13` → `pt-safe`
- `src/routes/Login.tsx:39`, `src/routes/Cadastro.tsx:55` → `pt-safe` no `<main>`
- `src/routes/NovaDespesa.tsx:242`, `src/routes/NovoRateio.tsx:223`, `src/routes/NovoReembolso.tsx:308` → `pb-safe-6`
- `EsqueciSenha.tsx:35` e `RedefinirSenha.tsx:56,73` já usam `pt-safe/pb-safe`; passam a funcionar com os utilitários acima.

`BottomNav.tsx`, `FAB.tsx` e `DetalheRateio.tsx:967` já usam `env()` diretamente.

### 2.7 Service worker no WebView

Em `src/main.tsx:23-26`, limitar o reload a web:

```ts
if (!Capacitor.isNativePlatform()) {
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload())
}
```

Manter o restante do PWA intacto para o site.

### 2.8 Offline

Criar `public/offline.html` (copiado para `dist/` pelo Vite): mensagem simples, botão "Tentar novamente" (`location.reload()`). Usado por `server.errorPath`.

### 2.9 Exclusão de conta (exigência da Play)

- Nova rota pública `/excluir-conta` (`src/routes/ExcluirConta.tsx`), registrada em `src/App.tsx` junto das rotas públicas, explicando o processo e oferecendo canal (mailto/formulário). A Play exige uma **URL web** de exclusão.
- Botão "Excluir conta" em `src/routes/Perfil.tsx` com confirmação. Para a v1, o botão pode abrir o fluxo de solicitação descrito na página; exclusão automatizada de dados + usuário do Neon Auth fica como follow-up documentado (exige RPC `SECURITY DEFINER` e/ou função serverless com chave de admin).
- Atualizar `src/routes/Privacidade.tsx`: dados coletados, finalidade, base legal LGPD, operadores (Neon, Vercel, Google), retenção, direitos, contato e exclusão.

---

## Fase 3 — Ícones, splash e tema

1. Criar `assets/` na raiz:
   - `icon-only.png` 1024×1024
   - `icon-foreground.png` 1024×1024 (logo dentro de 66% de safe zone)
   - `icon-background.png` 1024×1024 sólido `#00A868`
   - `splash.png` e `splash-dark.png` 2732×2732
   - Base: `public/icons/android-chrome-512x512.png`; para a Play, gerar também um ícone 512×512 **quadrado** (sem cantos arredondados).
2. Gerar recursos:

```powershell
npx @capacitor/assets generate --android `
  --iconBackgroundColor "#00A868" --iconBackgroundColorDark "#0F172A" `
  --splashBackgroundColor "#FFFFFF" --splashBackgroundColorDark "#0F172A"
```

3. Conferir splash do Android 12+ em `android/app/src/main/res/values-v31/styles.xml` (`Theme.SplashScreen`, fundo e ícone).

---

## Fase 4 — Assinatura e build

1. Criar upload key (guardar `.jks` e senhas fora do repo):

```powershell
keytool -genkeypair -v -keystore "$env:USERPROFILE\rateio-upload.jks" `
  -alias rateio -keyalg RSA -keysize 2048 -validity 10000
```

2. `android/keystore.properties` (não commitar; adicionar `*.jks`, `*.keystore`, `android/keystore.properties` ao `.gitignore`).
3. `android/app/build.gradle`: `signingConfigs.release` lendo `keystore.properties`; `buildTypes.release.signingConfig = signingConfigs.release`.
4. `AndroidManifest.xml`: `android:allowBackup="false"`, `android:usesCleartextTraffic="false"`.
5. Build:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat clean bundleRelease
```

Saída: `android/app/build/outputs/bundle/release/app-release.aab`.

---

## Fase 5 — Configuração Google Cloud e Neon Auth

1. **Google Cloud Console**
   - Manter o cliente **Web application** existente (usado pelo Neon Auth).
   - Criar cliente **Android** com package `io.github.lucasmm96.rateio` e SHA-1 de:
     - keystore de debug (testes locais),
     - upload key,
     - **app signing key do Play** (disponível só após o primeiro upload na Play Console).
   - O `serverClientId` do plugin é o **Web client ID**.
2. **Neon Console → Auth**
   - Garantir Google provider habilitado com o Web client ID/secret atuais.
   - Trusted origins/redirects: `https://meurateio.vercel.app` e `http://localhost:5173`.
   - Verificar se o branch de `idToken` está disponível no serviço hospedado (spike 2.1).
3. **App Links (opcional, reset de senha)**
   - `public/.well-known/assetlinks.json` com `package_name` e SHA-256 das chaves (upload + app signing).
   - Intent-filter `https://meurateio.vercel.app/redefinir-senha` no `AndroidManifest.xml`.
   - Se o e-mail do Neon Auth não puder apontar para essa URL, o reset abre no navegador — aceitável na v1.

---

## Fase 6 — Play Console

1. Criar app: nome `Meu Rateio`, idioma pt-BR, gratuito.
2. Ficha da loja:
   - Título ≤ 30 caracteres (ex.: `Meu Rateio` ou `Meu Rateio: Despesas`).
   - Descrição curta ≤ 80 e completa ≤ 4000.
   - Ícone 512×512 quadrado, feature graphic 1024×500 sem transparência, 2–8 screenshots de telefone sem dados reais.
   - Política de privacidade: `https://meurateio.vercel.app/privacidade`.
3. **App access**: informar que exige login e fornecer a conta demo.
4. **Data safety**:
   - Dados pessoais: nome e e-mail.
   - Financeiros: despesas/reembolsos informados pelo usuário.
   - Atividade no app: conteúdo gerado (links, descrições).
   - Tráfego criptografado: sim.
   - Exclusão de dados: sim, com a URL `/excluir-conta`.
   - Sem compartilhamento para publicidade.
5. Declarar que o app **não** é produto financeiro (não movimenta dinheiro, não oferece crédito).
6. Classificação de conteúdo: questionário; público-alvo 18+.
7. **Teste fechado**: criar track, lista com 12+ e-mails, manter 14 dias contínuos, corrigir feedback.
8. Solicitar produção; revisão; rollout escalonado 20% → 50% → 100%.

---

## Fase 7 — Verificação

### Web (sem regressão)

```powershell
npm run test
npm run lint
npm run build
```

Validar login e-mail/senha, Google web, XLSX por download, links externos e reset.

### Android

```powershell
npm run android:sync
npx cap open android   # ou npx cap run android
```

Matriz mínima em dispositivo real:
1. Instalação limpa, splash, carregamento do site.
2. Login e-mail/senha; sessão persiste após matar/reabrir.
3. Google Sign-In nativo; sessão persiste; cancelamento não trava o botão.
4. Exportar XLSX → share sheet → salvar/abrir.
5. Links externos abrem no navegador e voltam ao app.
6. Back físico: rota profunda volta; raiz sai.
7. Safe area com gestos e com 3 botões.
8. Dark mode: status bar e splash corretos.
9. Modo avião: mostra `offline.html` sem crash.
10. Logs: `adb logcat -s Capacitor:V Capacitor/Console:V`.

### OAuth no build de produção

- Subir o AAB no **internal testing**, instalar pelo link da Play (não por `adb install` de debug).
- Adicionar o SHA-1 do **Play App Signing** ao cliente Android no Google Cloud antes de testar.
- Testar com conta Google de teste e com a conta demo.

---

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Neon Auth rejeitar `idToken` no serviço hospedado | Spike 2.1 antes de tudo. Fallback: ocultar Google no Android na v1 e escalar com o suporte do Neon. |
| Cookie third-party bloqueado no WebView | `setAcceptThirdPartyCookies(true)` no `MainActivity`. Se persistir, proxy same-origin via rewrites da Vercel. |
| Play rejeitar por "funcionalidade mínima" (app majoritariamente WebView) | Destacar integrações nativas (share, browser, back, deep links, splash, offline), app funcional e conta demo nas notas de revisão. |
| Dependência total de rede | `offline.html`, mensagens de erro/retry; bundle local fica como evolução futura (muda a origem e o modelo de cookie). |
| Deploy web quebrar APK antigo | Manter contrato dos plugins estável e testar o site novo contra o APK vigente. |
| Perda da upload key | Backup do `.jks`/senhas; Play App Signing protege a chave de assinatura; reset de upload key é possível. |
| Prazo da conta pessoal | Iniciar conta e teste fechado cedo: 14 dias + revisão podem levar 3–4 semanas. |
| Deep link sequestrado | Custom scheme não é usado para sessão; App Links verificados para reset. |

---

## Ordem sugerida

1. **Semana 0**: conta Play Console, Android Studio/SDK 36, política de privacidade, `/excluir-conta`, conta demo.
2. **Semana 1**: Fase 1 (Capacitor) + Fase 2 (auth nativo, cookie, XLSX, links, back, safe area, offline) + deploy Vercel + spike do Google Sign-In.
3. **Semana 2**: assets, assinatura, AAB, internal testing, matriz de testes.
4. **Semanas 3–4**: teste fechado com 12 testadores por 14 dias.
5. **Semana 5**: solicitar produção, revisão e rollout.

## Arquivos críticos

- `capacitor.config.ts` (novo)
- `src/lib/native.ts` (novo), `src/lib/links-externos.ts` (novo), `public/offline.html` (novo)
- `src/db/auth.ts`, `src/lib/baixar-xlsx.ts`, `src/main.tsx`, `src/components/ThemeProvider.tsx`
- `src/App.tsx`, `src/routes/Perfil.tsx`, `src/routes/Privacidade.tsx`, `src/routes/ExcluirConta.tsx` (novo)
- `android/app/src/main/java/io/github/lucasmm96/rateio/MainActivity.java`
- `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `android/variables.gradle`
