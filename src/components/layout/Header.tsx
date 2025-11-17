import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import menuIcon from "../../assets/img/shape/menu.png";
import { NAVIGATION_ITEMS } from "@/lib/constants";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY) {
      // Scroll Down
      setIsVisible(false);
    } else {
      // Scroll Up
      setIsVisible(true);
    }

    setLastScrollY(currentScrollY);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 py-2 w-full border-b border-yellow-500/20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60  transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <img
              src="/assets/ethan-logo.jpg"
              alt="ETHAN"
              className="h-10 w-10 rounded-full border-2 border-yellow-500"
            />
            <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              ETHAN
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`menu-links font-medium transition-colors mr-2 ${
                  isActive(item.path)
                    ? "text-yellow-500 active"
                    : "text-gray-300 hover:text-yellow-400"
                }`}
              >
                {/* <span className="mr-2">{item.icon}</span> */}
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Wallet Connect & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <div className="block">
              <ConnectButton />
            </div>
            {/* <div className="hidden sm:block">
            <ConnectButton />
          </div> */}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}

      <div className="mobile-navigation hidden border-yellow-500/20">
        <ul className="inner-bar">
          {NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className="hover:text-yellow-400 "
                >
                  <Icon
                    className={`nav-icon ${
                      isActive(item.path) ? "text-yellow-500" : ""
                    }`}
                  />
                  <span
                    // variant={isActive(item.path) ? "default" : "ghost"}
                    className={`justify-center mobile-link ${
                      isActive(item.path) ? "text-yellow-500 active" : ""
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
