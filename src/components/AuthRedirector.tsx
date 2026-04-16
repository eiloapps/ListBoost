import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

const AuthRedirector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || !isAuthenticated) {
      return;
    }

    if (location.pathname === "/" && (searchParams.get("auth") || searchParams.get("code"))) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("auth");
      nextParams.delete("code");

      const nextSearch = nextParams.toString();
      navigate(`/dashboard${nextSearch ? `?${nextSearch}` : ""}`, { replace: true });
      return;
    }

    if (location.pathname === "/") {
      const nextParams = new URLSearchParams(searchParams);

      if (nextParams.has("auth")) {
        nextParams.delete("auth");
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [isAuthenticated, loading, location.pathname, navigate, searchParams, setSearchParams]);

  return null;
};

export default AuthRedirector;
