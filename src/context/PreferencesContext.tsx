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

  // Charge les préférences de l'utilisateur depuis Firestore (ou les valeurs
  // par défaut si déconnecté). Les setState sont faits dans la résolution async.
  useEffect(() => {
    let cancelled = false;
    const loadPrefs = async (): Promise<{
      genderFilter: GenderFilter;
      avatar: string;
    }> => {
      if (!user) return { genderFilter: "both", avatar: DEFAULT_AVATAR };
      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();
      return {
        genderFilter: isGenderFilter(data?.genderFilter)
          ? data.genderFilter
          : "both",
        avatar: typeof data?.avatar === "string" ? data.avatar : DEFAULT_AVATAR,
      };
    };
    loadPrefs()
      .then((prefs) => {
        if (cancelled) return;
        setGenderFilterState(prefs.genderFilter);
        setAvatarState(prefs.avatar);
      })
      .catch((err) =>
        console.error("Échec du chargement des préférences :", err),
      );
    return () => {
      cancelled = true;
    };
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
