import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth, type GenderFilter } from "../auth/AuthContext";
import { DEFAULT_AVATAR } from "../constants/avatars";

export type { GenderFilter };

type PreferencesContextValue = {
  genderFilter: GenderFilter;
  setGenderFilter: (value: GenderFilter) => void;
  avatar: string;
  setAvatar: (value: string) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

// Les préférences (filtre de genre, avatar) sont désormais des champs du compte,
// portés par l'utilisateur authentifié et persistés via /auth/profile.
export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const { user, patchProfile } = useAuth();

  const value = useMemo<PreferencesContextValue>(
    () => ({
      genderFilter: user?.genderFilter ?? "both",
      avatar: user?.avatar ?? DEFAULT_AVATAR,
      setGenderFilter: (genderFilter) => {
        patchProfile({ genderFilter }).catch((err) =>
          console.error("Échec de l'enregistrement des préférences :", err),
        );
      },
      setAvatar: (avatar) => {
        patchProfile({ avatar }).catch((err) =>
          console.error("Échec de l'enregistrement de l'avatar :", err),
        );
      },
    }),
    [user, patchProfile],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePreferences = () => {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences doit être utilisé dans un <PreferencesProvider>");
  }
  return ctx;
};
