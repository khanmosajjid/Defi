import { Link } from "react-router-dom";
import { NAVIGATION_ITEMS } from "@/lib/constants";
import { FaFacebookF } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTelegramPlane, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { IoIosSend } from "react-icons/io";
import iconBg from "../../assets/img/shape/icons_bg.svg";

export default function Footer() {
  return (
    <footer className="bg-black border-t border-yellow-500/20 mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div
            className="md:col-span-2"
            data-aos="fade-right"
            data-aos-delay="100"
          >
            <div className="flex items-center space-x-2 mb-4">
              <img
                src="/assets/ethan-logo.jpg"
                alt="ETHAN"
                className="h-10 w-10 rounded-full border-2 border-yellow-500"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                ETHAN
              </span>
            </div>
            <p className="text-gray-400 max-w-md">
              The DeFi 3.0 protocol based on the algorithmic non-stable currency
              ETN makes the world's first private and anonymous payment
              ecosystem. Building a Web3 Integrated Financial Ecosystem.
            </p>
            <div className="flex social_links space-x-4 mt-6">
              <a
                href="https://www.facebook.com/profile.php?id=61582330079749"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <div className="shape">
                  <img src={iconBg} alt="shape" />
                </div>
                <FaFacebookF className="icon" />
              </a>
              <a
                href="https://www.instagram.com/ethanofficial628/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <div className="shape">
                  <img src={iconBg} alt="shape" />
                </div>
                <FaInstagram className="icon" />
              </a>
              <a
                href="https://x.com/Ethan164379?t=winytz7U9aZ13IZXXWFZIA&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <div className="shape">
                  <img src={iconBg} alt="shape" />
                </div>
                <FaXTwitter className="icon" />
              </a>
              <a
                href="https://www.youtube.com/@EthanEthan-w7c"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <div className="shape">
                  <img src={iconBg} alt="shape" />
                </div>
                <FaYoutube className="icon" />
              </a>
              <a
                href="https://t.me/ethanofficial628"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-yellow-400 transition-colors"
              >
                <div className="shape">
                  <img src={iconBg} alt="shape" />
                </div>
                <FaTelegramPlane className="icon" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div data-aos="fade-right" data-aos-delay="150">
            <h3 className="text-golden-clr font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {NAVIGATION_ITEMS.slice(0, 5).map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-gray-400 menu-footer-link hover-menu-golden transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Links */}
          {/* <div>
            <h3 className="text-yellow-400 font-semibold mb-4">More</h3>
            <ul className="space-y-2">
              {NAVIGATION_ITEMS.slice(4).map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="text-gray-400 hover:text-yellow-400 transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div> */}

          <div
            className="footer-widget"
            data-aos="fade-right"
            data-aos-delay="200"
          >
            <h3 className="text-golden-clr font-semibold mb-4">
              Subscribe Newsletter
            </h3>
            <h4 className="fw-title"></h4>
            <div className="footer-newsletter">
              <p className="text-gray-400 text-sm max-w-md mb-4">
                Subscribe Our newsletter and get exclusive updates on earning
                opportunities and platform updates.
              </p>
              <form action="#">
                <input type="email" placeholder="Info@gmail.com" required />
                <button type="submit">
                  <IoIosSend className="send-icon" />
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="border-t border-yellow-500/20 mt-5 pt-5 bottom_5 text-center">
          <p className="text-gray-400">
            Copyright © 2025-2026 Ethantrade.com .
          </p>
        </div>
      </div>
    </footer>
  );
}
