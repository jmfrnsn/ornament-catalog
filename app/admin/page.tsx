import type { Metadata } from "next";
import { cookies } from "next/headers";

import { OrnamentAdminLoginForm } from "@/components/ornaments/OrnamentAdminLoginForm";
import { OrnamentLayout } from "@/components/ornaments/OrnamentLayout";
import {
  ORNAMENT_ADMIN_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/ornaments/admin-auth";

export const metadata: Metadata = {
  title: "Access — Ornaments — Jade Franson",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function OrnamentAdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ORNAMENT_ADMIN_COOKIE)?.value;
  const authenticated = verifyAdminSessionToken(token);

  return (
    <OrnamentLayout title="Access">
      <OrnamentAdminLoginForm initiallyAuthenticated={authenticated} />
    </OrnamentLayout>
  );
}
