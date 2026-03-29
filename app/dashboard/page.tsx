import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata as { role?: string })?.role;
    if (role === "admin") {
      redirect("/admin");
    }
  } catch (err) {
    console.error("[DashboardPage] Failed to resolve user role:", err);
  }

  redirect("/dashboard/create-order");
}
