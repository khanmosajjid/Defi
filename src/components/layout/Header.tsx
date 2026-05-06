import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { X } from "lucide-react";

export default function Header() {
  const [, setIsOpen] = useState(false);
  const location = useLocation();

  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    // Check if banner was closed by user
    const bannerClosed = localStorage.getItem("maintenanceBannerClosed");
    if (bannerClosed) {
      setShowBanner(false);
    }
  }, []);

  const handleCloseBanner = () => {
    setShowBanner(false);
    localStorage.setItem("maintenanceBannerClosed", "true");
  };

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
      {/* System Update Banner */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 border-b border-yellow-400 pt-3 pb-3 px-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="text-center flex-1">
              <p className="text-white text-sm md:text-base font-bold">
                Thank you, Ethan members, for your patience. The system update
                is in its final stage and will be back to normal between 11–15
                May. We truly appreciate your support.
              </p>
            </div>
            <button
              onClick={handleCloseBanner}
              className="ml-4 text-white hover:text-yellow-200 transition-colors flex-shrink-0 font-bold"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      <header
        className={`sticky top-0 z-50 py-2 w-full border-b border-yellow-500/20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/60  transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ top: showBanner ? "52px" : "0" }}
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
