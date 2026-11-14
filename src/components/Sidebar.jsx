
import {
  Activity,
  LayoutDashboard,
  AlertCircle,
  Server,
  Rocket,
  CalendarDays,
  Users,
  ClipboardList,
  Settings,
  X,
} from "lucide-react";

const navigation = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Dashboard", icon: LayoutDashboard },
      { name: "Incidents", icon: AlertCircle },
      { name: "Services", icon: Server },
      { name: "Deployments", icon: Rocket },
      { name: "Maintenance", icon: CalendarDays },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { name: "Team", icon: Users },
      { name: "Audit Logs", icon: ClipboardList },
      { name: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({
  activePage,
  onNavigate,
  isOpen,
  onClose,
  user,
}) {
  const displayName = user?.name || "Shaini Sharma";

  const initials = displayName
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function navigate(page) {
    onNavigate(page);
    onClose?.();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0
          flex-col bg-[#17243A] text-white shadow-xl
          transition-transform duration-300 ease-in-out
          lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0
          lg:shadow-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
              <Activity size={21} />
            </div>

            <span className="text-xl font-bold tracking-tight">
              OpsBoard
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={21} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-8 overflow-y-auto px-4 py-7">
          {navigation.map(section => (
            <div key={section.title}>
              <p className="mb-3 px-3 text-[10px] font-bold tracking-[2px] text-slate-500">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const active = activePage === item.name;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => navigate(item.name)}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow-lg"
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="font-medium">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User profile */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">
              {initials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {displayName}
              </p>
              <p className="text-xs text-slate-400">
                Cloud Engineer
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
