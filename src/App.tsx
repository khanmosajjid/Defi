import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from '@/providers/WalletProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

// Pages
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import Stake from './pages/Stake';
import Bond from './pages/Bond';
import Reward from './pages/Reward';
import DAO from './pages/DAO';
import NotFound from './pages/NotFound';

const App = () => (
  <WalletProvider>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="min-h-screen bg-black flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stake" element={<Stake />} />
              <Route path="/bond" element={<Bond />} />
              <Route path="/reward" element={<Reward />} />
              <Route
                path="/swap"
                element={
                  <div className="min-h-screen bg-black text-white flex items-center justify-center">
                    <h1 className="text-4xl text-yellow-400">
                      Swap - Coming Soon
                    </h1>
                  </div>
                }
              />
              <Route
                path="/invite"
                element={
                  <div className="min-h-screen bg-black text-white flex items-center justify-center">
                    <h1 className="text-4xl text-yellow-400">
                      Invite Page - Coming Soon
                    </h1>
                  </div>
                }
              />
              <Route
                path="/turbine"
                element={
                  <div className="min-h-screen bg-black text-white flex items-center justify-center">
                    <h1 className="text-4xl text-yellow-400">
                      Turbine Page - Coming Soon
                    </h1>
                  </div>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </WalletProvider>
);

export default App;