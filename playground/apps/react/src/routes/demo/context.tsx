import { createFileRoute } from '@tanstack/react-router';
import { useState, useRef, memo, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/demo/context')({
  component: () => (
    <CombinedProvider>
      <RouteComponent />
    </CombinedProvider>
  ),
});

interface UserStore {
  user: Record<string, unknown>;
  setUser: (user: Record<string, unknown>) => void;
}

interface LoginStore {
  login: boolean;
  setLogin: (login: boolean) => void;
}

function useUserStore(): UserStore {
  const [user, setUser] = useState<Record<string, unknown>>({});
  return {
    setUser,
    user,
  };
}

function useLoginStore(): LoginStore {
  const [login, setLogin] = useState(false);
  return {
    login,
    setLogin,
  };
}

const UserContext = createContext<UserStore | null>(null);
const LoginContext = createContext<LoginStore | null>(null);

function CombinedProvider({ children }: { children: ReactNode }) {
  const userStore = useUserStore();
  const loginStore = useLoginStore();

  return (
    <UserContext.Provider value={userStore}>
      <LoginContext.Provider value={loginStore}>{children}</LoginContext.Provider>
    </UserContext.Provider>
  );
}

const GrandChild = memo(() => {
  const renderCount = useRef(0);
  renderCount.current++;
  const userStore = useContext(UserContext);
  const { user } = userStore || {};
  return (
    <div>
      GrandChildCount: {renderCount.current / 2} User: {JSON.stringify(user)}
    </div>
  );
});

const Child = memo(() => {
  const renderCount = useRef(0);
  renderCount.current++;
  const loginStore = useContext(LoginContext);
  const { login } = loginStore || {};
  return (
    <div>
      ChildCount: {renderCount.current / 2} Login: {String(login)}
      <GrandChild />
      <GrandChild />
    </div>
  );
});

function RouteComponent() {
  const renderCount = useRef(0);
  renderCount.current++;
  const [state, setState] = useState(0);

  const userStore = useContext(UserContext);
  const loginStore = useContext(LoginContext);

  const { user, setUser } = userStore || {};
  const { login, setLogin } = loginStore || {};

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setState(state + 1)}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-green-700 text-white hover:opacity-90 transition-opacity"
        >
          Change state ({state})
        </button>
        <button
          onClick={() => setUser?.({ ...user, time: Date.now() })}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-blue-700 text-white hover:opacity-90 transition-opacity"
        >
          Change user
        </button>
        <button
          onClick={() => setLogin?.(!login)}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-purple-700 text-white hover:opacity-90 transition-opacity"
        >
          Change login
        </button>
      </div>
      <div className="border border-[var(--line)] p-4 rounded-xl bg-black/5">
        <p className="font-bold">Parent Render Count: {renderCount.current / 2}</p>
        <Child />
      </div>
    </div>
  );
}
