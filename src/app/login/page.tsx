import { AuthForm } from "@/components/auth/auth-form";
import Link from "next/link";

export default function LoginPage() {
  return <main className="app-shell auth-page"><Link className="brand auth-brand" href="/">cvforge<span className="brand-dot">.</span></Link><AuthForm mode="login" /></main>;
}
