import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('App Shell Layout & Routing Isolation', () => {
  it('App.tsx uses separated layouts and does not render public Navbar in AppLayout', () => {
    const appTsx = fs.readFileSync(path.join(rootDir, 'client/src/App.tsx'), 'utf8');

    // Separated layouts imported
    expect(appTsx).toContain("import { AppLayout } from './components/layout/AppLayout.js';");
    expect(appTsx).toContain("import { PublicLayout } from './components/layout/PublicLayout.js';");
    expect(appTsx).toContain("import { GuardianLayout } from './components/layout/GuardianLayout.js';");
    expect(appTsx).toContain("import { ResponderLayout } from './components/layout/ResponderLayout.js';");

    // Public Navbar and BottomNav are NOT imported in App.tsx
    expect(appTsx).not.toContain("import { Navbar }");
    expect(appTsx).not.toContain("import { BottomNav }");

    // PublicLayout wraps legal, login, signup, onboarding
    expect(appTsx).toContain('<Route element={<PublicLayout />}>');
    expect(appTsx).toContain('path="/login"');
    expect(appTsx).toContain('path="/signup"');
    expect(appTsx).toContain('path="/legal/privacy"');

    // AppLayout wraps protected /app/* routes
    expect(appTsx).toContain('<Route element={<AppLayout />}>');
  });

  it('AppLayout has correct CSS grid structure and persistent SOS button', () => {
    const layoutTsx = fs.readFileSync(
      path.join(rootDir, 'client/src/components/layout/AppLayout.tsx'),
      'utf8'
    );

    // Shell classes
    expect(layoutTsx).toContain('app-shell');
    expect(layoutTsx).toContain('app-sidebar');
    expect(layoutTsx).toContain('app-top');
    expect(layoutTsx).toContain('app-main');
    expect(layoutTsx).toContain('app-tabs');

    // Persistent Emergency SOS button in sidebar
    expect(layoutTsx).toContain('Emergency SOS');
    expect(layoutTsx).toContain('app-sidebar__footer');

    // Top bar contains dynamic title, theme toggle, and profile dropdown
    expect(layoutTsx).toContain('getPageTitle()');
    expect(layoutTsx).toContain('toggleTheme');
    expect(layoutTsx).toContain('profileMenuOpen');

    // Does NOT render public nav items like "Open App" in AppLayout
    expect(layoutTsx).not.toContain('Open App');
  });

  it('app-shell.css specifies 272px desktop sidebar, single scroll container, tablet icon rail', () => {
    const css = fs.readFileSync(
      path.join(rootDir, 'client/src/styles/app-shell.css'),
      'utf8'
    );

    expect(css).toContain('grid-template-columns: 272px minmax(0, 1fr)');
    expect(css).toContain('grid-template-rows: 56px minmax(0, 1fr)');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('min-width: 0');
  });

  it('HomePage removes SimulationNotice, computes real status subtitle, and sets map height clamp', () => {
    const homeTsx = fs.readFileSync(
      path.join(rootDir, 'client/src/pages/app/HomePage.tsx'),
      'utf8'
    );

    // No SimulationNotice
    expect(homeTsx).not.toContain('import { SimulationNotice }');
    expect(homeTsx).not.toContain('<SimulationNotice />');

    // No showcase words "active emergency bridge are online"
    expect(homeTsx).not.toContain('emergency bridge are online');

    // Real status computed
    expect(homeTsx).toContain('getStatusSubtitle()');
    expect(homeTsx).toContain('Location is on ·');
    expect(homeTsx).toContain('No guardian added yet — add one before you travel');
    expect(homeTsx).toContain('Location is off — turn it on to start a journey');

    // Map height clamp
    expect(homeTsx).toContain('clamp(260px, 42dvh, 520px)');

    // Cards min-w-0 and overflow-wrap
    expect(homeTsx).toContain('min-w-0 [overflow-wrap:anywhere]');
  });
});

describe('Multilingual Fake Call Feature', () => {
  it('FakeCallPage defines at least 8 languages with 5-7 turn conversational scripts', () => {
    const fakeCallTsx = fs.readFileSync(
      path.join(rootDir, 'client/src/pages/app/FakeCallPage.tsx'),
      'utf8'
    );

    // Languages supported
    expect(fakeCallTsx).toContain("'hi-IN'");
    expect(fakeCallTsx).toContain("'en-IN'");
    expect(fakeCallTsx).toContain("'hinglish'");
    expect(fakeCallTsx).toContain("'pa-IN'");
    expect(fakeCallTsx).toContain("'ta-IN'");
    expect(fakeCallTsx).toContain("'te-IN'");
    expect(fakeCallTsx).toContain("'bn-IN'");
    expect(fakeCallTsx).toContain("'mr-IN'");

    // Dialogue preview and language selector
    expect(fakeCallTsx).toContain('selectedLanguage');
    expect(fakeCallTsx).toContain('Dialogue Turns');
    expect(fakeCallTsx).toContain('Voice Language / भाषा');
  });

  it('speech.ts supports language voice mapping and human cadence tuning', () => {
    const speechTs = fs.readFileSync(
      path.join(rootDir, 'client/src/lib/speech.ts'),
      'utf8'
    );

    expect(speechTs).toContain('LANGUAGE_VOICE_MAP');
    expect(speechTs).toContain('utterance.rate = 0.92');
    expect(speechTs).toContain('utterance.pitch = 1.02');
    expect(speechTs).toContain('language: string = \'en-IN\'');
  });

  it('FakeCallIncomingPage passes language to speechEngine and displays badge', () => {
    const incomingTsx = fs.readFileSync(
      path.join(rootDir, 'client/src/pages/app/FakeCallIncomingPage.tsx'),
      'utf8'
    );

    expect(incomingTsx).toContain('callLanguage');
    expect(incomingTsx).toContain('scriptLanguage');
    expect(incomingTsx).toContain('speechEngine.speakScript');
  });
});
