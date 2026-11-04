export function SignOutButton() {
  return <form action="/auth/signout" method="post"><button className="auth-text-action" type="submit">Sign out</button></form>;
}
