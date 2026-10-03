import { createContext, useContext } from "react";
export type NavigationContext = {
  organization: string;
  project: string | null;
};
export const defaultContext: NavigationContext = {
  organization: "Workspace",
  project: null,
};
const Context = createContext(defaultContext);
export const ActiveContextProvider = Context.Provider;
export function useActiveContext() {
  return useContext(Context);
}
