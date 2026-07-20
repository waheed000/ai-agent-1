// Re-export from auth context for backward compatibility.
// Components import useAuth and get the full context value including
// user, isAuthenticated, isLoading, login, register, logout, updateUser.
export { useAuthContext as useAuth } from '@/context/auth-context';
