import { ToastProvider } from './components/Toast';
import { useRoute, type Route } from './router';
import { AddByNameScreen } from './screens/AddByNameScreen';
import { BackupScreen } from './screens/BackupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ItemScreen } from './screens/ItemScreen';
import { NeedToBuyScreen } from './screens/NeedToBuyScreen';
import { PantryScreen } from './screens/PantryScreen';
import { RestockScreen } from './screens/RestockScreen';
import { ScanScreen } from './screens/ScanScreen';
import { SetupScreen } from './screens/SetupScreen';
import { ShareScreen } from './screens/ShareScreen';
import { SignInScreen } from './screens/SignInScreen';
import { SessionContext, signOut, useSessionState } from './session';

export function App() {
  return (
    <ToastProvider>
      <SessionGate />
    </ToastProvider>
  );
}

function SessionGate() {
  const session = useSessionState();

  switch (session.status) {
    case 'loading':
      return (
        <main className="screen home">
          <h1 className="home__title">Pantry</h1>
          <p className="lead" role="status">
            {session.waitingForInternet ? 'Waiting for an internet connection…' : 'Opening your pantry…'}
          </p>
        </main>
      );
    case 'signed-out':
      return <SignInScreen />;
    case 'no-pantry':
      return <SetupScreen user={session.user} />;
    case 'error':
      return (
        <main className="screen home">
          <h1 className="home__title">Pantry</h1>
          <div className="stack">
            <p className="error" role="alert">
              Your pantry couldn’t be opened.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
              Try again
            </button>
            <button type="button" className="link-btn" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </main>
      );
    case 'ready':
      return (
        <SessionContext.Provider value={{ user: session.user, pantry: session.pantry }}>
          <Screens key={session.pantry.id} />
        </SessionContext.Provider>
      );
  }
}

function Screens() {
  const route = useRoute();
  return <CurrentScreen route={route} />;
}

function CurrentScreen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'scan':
      return <ScanScreen />;
    case 'add-by-name':
      return <AddByNameScreen />;
    case 'pantry':
      return <PantryScreen />;
    case 'need':
      return <NeedToBuyScreen />;
    case 'item':
      return <ItemScreen key={route.id} id={route.id} />;
    case 'restock':
      return <RestockScreen key={route.id} id={route.id} />;
    case 'backup':
      return <BackupScreen />;
    case 'share':
      return <ShareScreen />;
  }
}
