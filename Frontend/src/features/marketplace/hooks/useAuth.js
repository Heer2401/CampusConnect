import { useAuth as useAppAuth } from '../../../context/AuthContext';

/**
 * Shared Auth hook that wraps canonical AuthContext.
 * Ensures consistent session, JWT token, and authenticated user across all features.
 */
export const useAuth = () => {
  const auth = useAppAuth();
  return {
    ...auth,
    isAuthenticated: Boolean(auth.user),
  };
};

export default useAuth;
