import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user data server-side for the navbar
  let credits = 0;
  let userEmail = "";
  let userName = "";
  let userImageUrl = "";

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

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
    console.error("[DashboardLayout] Failed to fetch user from Clerk:", err);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <DashboardNav
        credits={credits}
        userEmail={userEmail}
        userName={userName}
        userImageUrl={userImageUrl}
      />
      {/* Page content — push down by navbar height (64px) */}
      <main className="pt-16">{children}</main>
    </div>
  );
}
