import { redirect } from "next/navigation";

// Redirect /admin → /admin/dashboard
export default function AdminRoot() {
  redirect("/admin/dashboard");
}
