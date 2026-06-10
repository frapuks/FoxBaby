import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  reauthenticate: (currentPassword: string) => Promise<void>;
  updateUserEmail: (email: string) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithEmail: async (email, password) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      signUpWithEmail: async (email, password) => {
        await createUserWithEmailAndPassword(auth, email, password);
      },
      signInWithGoogle: async () => {
        await signInWithPopup(auth, googleProvider);
      },
      logout: async () => {
        await signOut(auth);
      },
      updateName: async (name) => {
        if (!auth.currentUser) throw new Error("Aucun utilisateur connecté");
        await updateProfile(auth.currentUser, { displayName: name });
        // Force un rafraîchissement de l'objet user pour refléter le nouveau nom
        setUser({ ...auth.currentUser });
      },
      reauthenticate: async (currentPassword) => {
        if (!auth.currentUser?.email)
          throw new Error("Aucun utilisateur connecté");
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
          currentPassword,
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      },
      updateUserEmail: async (email) => {
        if (!auth.currentUser) throw new Error("Aucun utilisateur connecté");
        // Envoie un email de vérification à la nouvelle adresse ; le changement
        // ne prend effet qu'une fois le lien confirmé.
        await verifyBeforeUpdateEmail(auth.currentUser, email);
      },
      updateUserPassword: async (password) => {
        if (!auth.currentUser) throw new Error("Aucun utilisateur connecté");
        await updatePassword(auth.currentUser, password);
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
