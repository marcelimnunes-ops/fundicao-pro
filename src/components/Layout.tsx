import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

interface MenuItem { label: string; href: string }
interface MenuGroup {
  label: string;
  icon: string;
  href?: string;  // se for item direto sem filhos
  items?: MenuItem[];
}

const MENU: MenuGroup[] = [
  { label: 'Dashboard',  icon: '📊', href: '/' },
  {
    label: 'Cadastros', icon: '🗂️',
    items: [
      { label: 'Funcionários', href: '/funcionarios' },
      { label: 'Clientes',     href: '/clientes' },
      { label: 'Produtos',     href: '/produtos' },
    ],
  },
  {
    label: 'Produção', icon: '🏭',
    items: [
      { label: 'Apontamento', href: '/apontamento' },
    ],
  },
  {
    label: 'Materiais', icon: '📦',
    items: [
      { label: 'Estoque',  href: '/estoque' },
      { label: 'Compras',  href: '/compras' },
    ],
  },
  {
    label: 'Relatórios', icon: '📈',
    items: [
      { label: 'Resumo',      href: '/relatorios' },
      { label: 'Avançados',   href: '/relatorios-avancados' },
      { label: 'Gargalos',    href: '/gargalos' },
      { label: 'Correlações', href: '/correlacoes' },
    ],
  },
  {
    label: 'Sistema', icon: '⚙️',
    items: [
      { label: 'Importação',   href: '/importacao' },
      { label: 'Configurações', href: '/configuracoes' },
    ],
  },
];

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Abre automaticamente o grupo da rota atual
  useEffect(() => {
    const auto: Record<string, boolean> = {};
    MENU.forEach((g) => {
      if (g.items?.some((i) => router.pathname.startsWith(i.href))) {
        auto[g.label] = true;
      }
    });
    setExpanded((prev) => ({ ...prev, ...auto }));
  }, [router.pathname]);

  const toggle = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href: string) => router.pathname === href;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-transform duration-300 z-50`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-base">⚙️</div>
            <div>
              <h1 className="font-bold text-base leading-tight">Fundição PRO</h1>
              <p className="text-xs text-slate-400">v1.0</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {MENU.map((group) => {
            // Item direto (sem filhos)
            if (group.href) {
              return (
                <Link
                  key={group.href}
                  href={group.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(group.href)
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-5 text-center">{group.icon}</span>
                  {group.label}
                </Link>
              );
            }

            // Grupo com filhos
            const open = expanded[group.label] ?? false;
            const anyActive = group.items?.some((i) => router.pathname.startsWith(i.href));

            return (
              <div key={group.label} className="mx-2 mb-0.5">
                <button
                  onClick={() => toggle(group.label)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    anyActive
                      ? 'text-orange-300 bg-slate-700/50'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <span className="w-5 text-center">{group.icon}</span>
                  <span className="flex-1 text-left">{group.label}</span>
                  <span className={`text-xs transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
                </button>

                {open && (
                  <div className="ml-8 mt-0.5 space-y-0.5 border-l border-slate-600 pl-3">
                    {group.items?.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`block px-3 py-2 rounded-lg text-sm transition-all ${
                          isActive(item.href)
                            ? 'bg-orange-500 text-white font-semibold'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden text-slate-600 hover:text-slate-900">
              ☰
            </button>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-slate-500 hover:text-slate-800">🔔</button>
            <button className="text-slate-500 hover:text-slate-800">👤</button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
