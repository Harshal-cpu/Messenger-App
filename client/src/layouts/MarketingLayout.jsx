import { Outlet } from 'react-router-dom';
import Header from '../components/marketing/Header';
import Footer from '../components/marketing/Footer';

export default function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-app-bgLight dark:bg-app-bg text-ink-dark dark:text-ink">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
