import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";


export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col" suppressHydrationWarning>
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
} 