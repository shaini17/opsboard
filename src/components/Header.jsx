
import { useState } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  User,
  Settings,
  LogOut,
  ShieldCheck,
  Menu,
} from "lucide-react";

export default function Header({
  user,
  onLogout,
  onNavigate,
  onMenuClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const displayName = user?.name || "Shaini Sharma";

  const initials = displayName
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-30 flex h-[76px] shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 sm:px-6 lg:px-8">

      {/* Left section */}
      <div className="flex min-w-0 flex-1 items-center gap-3">

        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={23} />
        </button>

        <div className="relative w-full max-w-[320px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search anything..."
            aria-label="Search"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="ml-2 flex shrink-0 items-center gap-2 sm:ml-4 sm:gap-5">

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-blue-600"
        >
          <Bell size={21} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
        </button>

        {/* Profile */}
        <div className="relative">

          <button
            type="button"
            onClick={() => setMenuOpen(p => !p)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-50 sm:gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
              {initials}
            </div>

            <div className="hidden text-left sm:block">
              <p className="max-w-[130px] truncate text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <ChevronDown
              size={16}
              className={`hidden text-slate-400 transition sm:block ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close profile menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />

              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="border-b border-slate-100 p-4">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {user?.email || "shaini@example.com"}
                  </p>

                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    <ShieldCheck size={13} />
                    Administrator
                  </span>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onNavigate?.("Settings");
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <User size={17} className="text-slate-400" />
                    My Profile
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onNavigate?.("Settings");
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings size={17} className="text-slate-400" />
                    Settings
                  </button>
                </div>

                <div className="border-t border-slate-100 p-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout?.();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={17} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
