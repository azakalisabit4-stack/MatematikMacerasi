"use client";

import { PageLoader } from "@/components/ui";
import { ProfileView } from "@/components/profile/ProfileView";
import { useSession } from "@/components/app/SessionProvider";

export default function MyProfilePage() {
  const { summary } = useSession();
  if (!summary) return <PageLoader />;
  return <ProfileView username={summary.user.username} />;
}
