import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return <main className="app-shell auth-page"><Link className="brand auth-brand" href="/">cvforge<span className="brand-dot">.</span></Link><ResetPasswordForm /></main>;
}
