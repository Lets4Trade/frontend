"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const dynamic = 'force-dynamic';

export default function NotFound() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <h2 className="text-2xl font-bold">Not Found</h2>
      <p className="text-gray-11">
        Could not find requested resource: {pathname}
      </p>
      <Link href="/" className="text-link-11">
        Return Home
      </Link>
    </div>
  );
}
