import { Facebook, Instagram, Send, Twitter, Youtube } from "lucide-react";

export default function Footer() {
  const footerSections = [
    {
      title: "Protocol",
      links: [
        { name: "Stake", href: "#stake" },
        { name: "Farm", href: "#farm" },
        { name: "Swap", href: "#swap" },
        { name: "Pool", href: "#pool" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "#docs" },
        { name: "Whitepaper", href: "#whitepaper" },
        { name: "Audit Reports", href: "#audits" },
        { name: "Bug Bounty", href: "#bounty" },
      ],
    },
    {
      title: "Community",
      links: [
        { name: "Governance", href: "#governance" },
        { name: "Forum", href: "#forum" },
        { name: "Blog", href: "#blog" },
        { name: "Newsletter", href: "#newsletter" },
      ],
    },
    {
      title: "Support",
      links: [
        { name: "Help Center", href: "#help" },
        { name: "Contact Us", href: "#contact" },
        { name: "Terms of Service", href: "#terms" },
        { name: "Privacy Policy", href: "#privacy" },
      ],
    },
  ];

  const socialLinks = [
    {
      icon: Instagram,
      href: "https://www.instagram.com/ethanofficial628/",
      label: "Instagram",
    },
    {
      icon: Twitter,
      href: "https://x.com/Ethan164379?t=winytz7U9aZ13IZXXWFZIA&s=09",
      label: "X (Twitter)",
    },
    {
      icon: Facebook,
      href: "https://www.facebook.com/profile.php?id=61582330079749",
      label: "Facebook",
    },
    {
      icon: Youtube,
      href: "https://www.youtube.com/@EthanEthan-w7c",
      label: "YouTube",
    },
    {
      icon: Send,
      href: "https://t.me/ethanofficial628",
      label: "Telegram",
    },
  ];

  return (
    <footer className="bg-black border-t border-yellow-500/20">
      <div className="container mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-6">
              <img
                src="/assets/Ethan_cropped_page-0001.jpg"
                alt="ETHAN Logo"
                className="h-12 w-auto"
              />
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              ETHAN is the next-generation DeFi platform, empowering users with
              advanced yield farming, staking, and trading capabilities in a
              secure, decentralized environment.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 hover:bg-yellow-500 rounded-lg flex items-center justify-center transition-all duration-200 hover:transform hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5 text-gray-400 hover:text-black" />
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section, index) => (
            <div key={index}>
              <h3 className="text-white font-semibold mb-4 text-lg">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-500/20 rounded-xl p-8 mb-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Stay Updated with ETHAN
            </h3>
            <p className="text-gray-300 mb-6">
              Get the latest updates on new features, yield opportunities, and
              protocol developments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
              <button className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold rounded-lg transition-all duration-200">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              © 2024 ETHAN Protocol. All rights reserved.
            </div>
            <div className="flex space-x-6 text-sm">
              <a
                href="#terms"
                className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
              >
                Terms of Service
              </a>
              <a
                href="#privacy"
                className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
              >
                Privacy Policy
              </a>
              <a
                href="#cookies"
                className="text-gray-400 hover:text-yellow-400 transition-colors duration-200"
              >
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
