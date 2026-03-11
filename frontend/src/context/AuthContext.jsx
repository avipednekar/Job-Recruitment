import { useState, useEffect } from "react";
import { loginUser, registerUser, logoutUser, getMe } from "../services/api";
import toast from "react-hot-toast";
import AuthContext from "./auth-context";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session on mount
    useEffect(() => {
        const restoreSession = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await getMe();
                setUser(res.data.user);
            } catch {
                localStorage.removeItem("token");
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        restoreSession();
    }, []);

    const login = async (email, password) => {
        const res = await loginUser({ email, password });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        toast.success(`Welcome back, ${res.data.user.name}!`);
        return res.data;
    };

    const register = async (name, email, password, role) => {
        const res = await registerUser({ name, email, password, role });
        localStorage.setItem("token", res.data.token);
        setUser(res.data.user);
        toast.success("Account created successfully!");
        return res.data;
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch {
            // ignore
        }
        localStorage.removeItem("token");
        setUser(null);
        toast.success("Logged out successfully");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
