import { createContext } from "react";
import type { User } from "../types";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  sessionError: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
