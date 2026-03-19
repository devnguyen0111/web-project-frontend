import { redirect } from "next/navigation";

export default function LegacySubscriptionsRedirectPage() {
  redirect("/subscription");
}
