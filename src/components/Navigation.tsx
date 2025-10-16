"use client";

import Link from "next/link";
import { getPagePath } from "@/lib/paths";

const Navigation = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href={getPagePath("/")}
              className="text-xl font-bold text-gray-900"
            >
              Карта УжНУ
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
