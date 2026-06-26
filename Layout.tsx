import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const menuItems = [
    { label: '📊 Dashboard', href: '/' },
    { label: '📝 Apontamento', href: '/apontamento' },
    { label: '📦 Produtos', href: '/produtos' },
    { label: '👥 Funcionários', href: '/funcionarios' },
    { label: '🏭 Estoque', href: '/estoque' },
    { label: '📈 Relatórios', href: '/relatorios' },
    { label: '⚙️ Configurações', href: '/configuracoes' },
  ];

  const isActive = (href: string) => router.pathname === href;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* SIDEBAR */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col transition-transform duration-300 z-50`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-lg">⚙️</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">Fundição PRO</h1>
              <p className="text-xs text-slate-400">v1.0</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive(item.href)
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              ☰
            </button>
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-600 hover:text-slate-900">🔔</button>
            <button className="text-slate-600 hover:text-slate-900">👤</button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 md:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
