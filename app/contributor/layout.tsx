import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/contributor/Sidebar";
import { IssueNotification } from "@/components/contributor/IssueNotification";
import { hasContributorAccess } from "@/lib/permissions";

export default async function ContributorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const hasAccess = await hasContributorAccess();

  if (!session?.user) {
    return redirect("/login?callbackUrl=/contributor");
  }

  // Check if user has appropriate role
  if (!hasAccess) {
    return redirect("/?error=You+do+not+have+contributor+access");
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-x-hidden" >
      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0" >
        <Sidebar />
      </div>

      {/* Mobile sidebar - rendering outside normal document flow */}
      <div className="lg:hidden">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 w-full lg:pl-72">
        <div className="py-6 px-3 sm:px-4 md:px-6 lg:px-8 pt-16 lg:pt-6 max-w-full h-full">
          {children}
        </div>
      </main>

      {/* Issue Notification */}
      {/* <IssueNotification count={1} /> */}
    </div>
  );
}
