import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/lib/constants';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-yellow-500/20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src="/assets/ethan-logo.jpg" 
            alt="ETHAN" 
            className="h-10 w-10 rounded-full border-2 border-yellow-500"
          />
          <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            ETN
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {NAVIGATION_ITEMS.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive(item.path) ? "default" : "ghost"}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                    : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-500/10'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Wallet Connect & Mobile Menu */}
        <div className="flex items-center space-x-4">
          <div className="hidden sm:block">
            <ConnectButton />
          </div>
          
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-black border-yellow-500/20">
              <div className="flex flex-col space-y-4 mt-8">
                <div className="sm:hidden mb-4">
                  <ConnectButton />
                </div>
                {NAVIGATION_ITEMS.map((item) => (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                  >
                    <Button
                      variant={isActive(item.path) ? "default" : "ghost"}
                      className={`w-full justify-start text-left ${
                        isActive(item.path)
                          ? 'bg-yellow-500 text-black'
                          : 'text-gray-300 hover:text-yellow-400 hover:bg-yellow-500/10'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}