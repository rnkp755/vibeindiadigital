import { DashboardNavbar } from "./Navbar";

interface DashboardNavProps {
  credits: number;
  userEmail: string;
  userName: string;
  userImageUrl: string;
}

export function DashboardNav(props: DashboardNavProps) {
  // This is a thin server-component wrapper.
  // All interactivity lives inside DashboardNavbar (client component).
  return <DashboardNavbar {...props} />;
}
