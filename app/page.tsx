"use client"

import EmailSender from "@/components/email-sender";
import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/loading-spinner";
import Login from "@/components/login";

export default function Home() {

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        setIsAuthenticated(data.isAuthenticated);
      } catch (error) {
        console.error("Auth check failed:", error);
      }
      setIsCheckingAuth(false);
    };
    setIsCheckingAuth(true)
    checkAuth();
  }, []);

  const handleSignIn = () => {
    window.location.href = "/api/auth/login";
  };

  if (isCheckingAuth) {
    return (
      <LoadingSpinner />
    )
  }

  if (!isAuthenticated) {
    return (
      <Login handleSignIn={handleSignIn} />
    );
  }

  return (
    <EmailSender />
  );
}
