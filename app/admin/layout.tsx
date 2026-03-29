import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  let credits = 0;
  let userEmail = "";
  let userName = "";
  let userImageUrl = "";

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const role = (user.publicMetadata as { role?: string })?.role;
    if (role !== "admin") {
      redirect("/dashboard");
    }

    credits =
      typeof user.publicMetadata?.credits === "number"
        ? (user.publicMetadata.credits as number)
        : 0;

    userEmail =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      "";

    userName =
      user.firstName
        ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
        : user.username ?? userEmail.split("@")[0];

    userImageUrl = user.imageUrl ?? "";
  } catch (err) {
    console.error("[AdminLayout] Failed to fetch user from Clerk:", err);
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DashboardNav
        credits={credits}
        userEmail={userEmail}
        userName={userName}
        userImageUrl={userImageUrl}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}
