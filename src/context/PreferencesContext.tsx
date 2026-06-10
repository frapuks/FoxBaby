import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthContext";
import { DEFAULT_AVATAR } from "../constants/avatars";

export type GenderFilter = "boy" | "girl" | "both";

type PreferencesContextValue = {
  genderFilter: GenderFilter;
  setGenderFilter: (value: GenderFilter) => void;
  avatar: string;
  setAvatar: (value: string) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(
  undefined,
);

const isGenderFilter = (value: unknown): value is GenderFilter =>
  value === "boy" || value === "girl" || value === "both";

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [genderFilter, setGenderFilterState] = useState<GenderFilter>("both");
  const [avatar, setAvatarState] = useState<string>(DEFAULT_AVATAR);

  // Charge les préférences de l'utilisateur depuis Firestore
  useEffect(() => {
    if (!user) {
      setGenderFilterState("both");
      setAvatarState(DEFAULT_AVATAR);
      return;
    }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        const data = snap.data();
        if (isGenderFilter(data?.genderFilter)) {
          setGenderFilterState(data.genderFilter);
        }
        if (typeof data?.avatar === "string") {
          setAvatarState(data.avatar);
        }
      })
      .catch((err) =>
        console.error("Échec du chargement des préférences :", err),
      );
  }, [user]);

  const persist = (data: Partial<{ genderFilter: GenderFilter; avatar: string }>) => {
    if (!user) return;
    setDoc(doc(db, "users", user.uid), data, { merge: true }).catch((err) =>
      console.error("Échec de l'enregistrement des préférences :", err),
    );
  };

  const setGenderFilter = (value: GenderFilter) => {
    setGenderFilterState(value);
    persist({ genderFilter: value });
  };

  const setAvatar = (value: string) => {
    setAvatarState(value);
    persist({ avatar: value });
  };

  const value = useMemo(
    () => ({ genderFilter, setGenderFilter, avatar, setAvatar }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [genderFilter, avatar, user],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error(
      "usePreferences doit être utilisé dans un <PreferencesProvider>",
    );
  }
  return ctx;
};
