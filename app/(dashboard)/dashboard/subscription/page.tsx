import { redirect } from "next/navigation";

export default function LegacyDashboardSubscriptionRedirectPage() {
  redirect("/settings/subscription");
}
