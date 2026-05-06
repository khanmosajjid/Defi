import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const navItems = [
    { name: "Home", href: "#home" },
    { name: "Stake", href: "#stake" },
    { name: "Farm", href: "#farm" },
    { name: "Swap", href: "#swap" },
    { name: "Pool", href: "#pool" },
    { name: "Analytics", href: "#analytics" },
  ];

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
        className="fixed left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-yellow-500/20"
        style={{ top: showBanner ? "52px" : "0" }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <img
                src="/assets/Ethan_cropped_page-0001.jpg"
                alt="ETHAN Logo"
                className="h-10 w-auto"
              />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-white hover:text-yellow-400 transition-colors duration-200 font-medium"
                >
                  {item.name}
                </a>
              ))}
            </nav>

            {/* Connect Wallet Button */}
            <div className="hidden md:flex items-center space-x-4">
              <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold px-6 py-2 rounded-lg transition-all duration-200">
                Connect Wallet
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-yellow-500/20">
              <nav className="flex flex-col space-y-3 mt-4">
                {navItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-white hover:text-yellow-400 transition-colors duration-200 font-medium py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </a>
                ))}
                <Button className="bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold px-6 py-2 rounded-lg transition-all duration-200 mt-4">
                  Connect Wallet
                </Button>
              </nav>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
