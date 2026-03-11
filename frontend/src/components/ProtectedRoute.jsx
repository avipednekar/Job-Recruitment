import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = ({ children }) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-surface">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // If profile is incomplete and user is not already on the setup page, redirect
    if (
        user &&
        !user.profileComplete &&
        location.pathname !== "/profile/setup"
    ) {
        return <Navigate to="/profile/setup" replace />;
    }

    return children;
};

export default ProtectedRoute;
