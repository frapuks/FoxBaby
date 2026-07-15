import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../api";

export type GenderFilter = "boy" | "girl" | "both";

// Utilisateur public renvoyé par le backend.
type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatar: string;
  genderFilter: GenderFilter;
  hasPassword: boolean;
};

// Forme consommée par l'app. `uid` conserve le nom historique (ex-Firebase).
export type AppUser = {
  uid: string;
  email: string;
  displayName: string;
  avatar: string;
  genderFilter: GenderFilter;
  hasPassword: boolean;
};

const toAppUser = (u: PublicUser): AppUser => ({
  uid: u.id,
  email: u.email,
  displayName: u.displayName,
  avatar: u.avatar,
  genderFilter: u.genderFilter,
  hasPassword: u.hasPassword,
});

type ProfileFields = { displayName?: string; avatar?: string; genderFilter?: GenderFilter };

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  patchProfile: (fields: ProfileFields) => Promise<AppUser>;
  updateUserEmail: (email: string, currentPassword?: string) => Promise<void>;
  updateUserPassword: (currentPassword: string | null, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaure la session au démarrage à partir du cookie httpOnly.
  useEffect(() => {
    api
      .get<{ user: PublicUser }>("/auth/me")
      .then((r) => setUser(toAppUser(r.user)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithEmail: async (email, password) => {
        const r = await api.post<{ user: PublicUser }>("/auth/login", { email, password });
        setUser(toAppUser(r.user));
      },
      signUpWithEmail: async (email, password) => {
        const r = await api.post<{ user: PublicUser }>("/auth/register", { email, password });
        setUser(toAppUser(r.user));
      },
      signInWithGoogle: async (idToken) => {
        const r = await api.post<{ user: PublicUser }>("/auth/google", { idToken });
        setUser(toAppUser(r.user));
      },
      logout: async () => {
        await api.post("/auth/logout");
        setUser(null);
      },
      updateName: async (name) => {
        const r = await api.patch<{ user: PublicUser }>("/auth/profile", { displayName: name });
        setUser(toAppUser(r.user));
      },
      patchProfile: async (fields) => {
        const r = await api.patch<{ user: PublicUser }>("/auth/profile", fields);
        const u = toAppUser(r.user);
        setUser(u);
        return u;
      },
      updateUserEmail: async (email, currentPassword) => {
        const r = await api.patch<{ user: PublicUser }>("/auth/email", { email, currentPassword });
        setUser(toAppUser(r.user));
      },
      updateUserPassword: async (currentPassword, newPassword) => {
        await api.patch("/auth/password", {
          currentPassword: currentPassword ?? undefined,
          newPassword,
        });
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé dans un <AuthProvider>");
  }
  return ctx;
};
