import React, { useState } from "react";
import { IoIosSearch } from "react-icons/io";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

interface TransactionItem {
  icon: string;
  title: string;
  date: string;
  history: string;
  status: "Successful" | "Pending" | "Canceled";
  amount: string;
}

const data: TransactionItem[] = [
  {
    icon: "/assets/images/bitcoin.png",
    title: "Bitcoin",
    date: "03/05/2025",
    history: "0df3635...eq23",
    status: "Successful",
    amount: "+0.2948 BTC",
  },
  {
    icon: "/assets/images/cardano.png",
    title: "Cardano",
    date: "03/05/2024",
    history: "0df3635...eq23",
    status: "Successful",
    amount: "+0.8475 ADA",
  },
  {
    icon: "/assets/images/bitcoin.png",
    title: "Bitcoin",
    date: "03/05/2025",
    history: "0df3635...eq23",
    status: "Pending",
    amount: "+0.2948 BTC",
  },
  {
    icon: "/assets/images/bitcoin.png",
    title: "Bitcoin",
    date: "04/05/2026",
    history: "0df3635...eq23",
    status: "Canceled",
    amount: "+0.2948 BTC",
  },
  {
    icon: "/assets/images/bitcoin.png",
    title: "Bitcoin",
    date: "03/05/2025",
    history: "0df3635...eq23",
    status: "Successful",
    amount: "+0.2948 BTC",
  },
];

export default function UserReport() {
  const [search, setSearch] = useState("");

  const filtered = data.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* <div className="bread-shape">
          <div className="breadcrumb-bg"></div>
        </div> */}
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8" data-aos="fade-right">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
              User Report
            </h1>
            <p className="text-gray-400">
              Purchase bonds at a discount and receive ETN tokens after vesting
              period
            </p>
          </div>

          <div className="table-area n0-bg cus-rounded-1 p-4 p-lg-6 border border-yellow-500/20"
          data-aos="fade-up" data-aos-delay="50">
            {/* Header */}
            <div className="header-part flex flex-wrap justify-between items-center gap-8 row-gap-3 pb-5 pb-xxl-6 mb-5 mb-xxl-6">
              <h4 className="text-2xl font bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent mb-2">
                Report
              </h4>

              <div className="flex flex-wrap flex-sm-nowrap gap-4 gap-xxl-6">
                {/* Search Box */}
                <form
                  className="search__form"
                  onSubmit={(e) => e.preventDefault()}
                >
                  <div className="d-center  gap-1 bg1-opty p-1 pl-3 ps-lg-8 cus-border cus-rounded-1 alt_form">
                    <input
                      type="text"
                      placeholder="Search"
                      required
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="p1-bg rounded p-2 center box_10"
                    >
                      <IoIosSearch className="search-icon text-center ml- text-2xl" />
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Table */}
            <div className="table-main">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>History</th>
                    <th>Status</th>
                    <th>Transaction</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="flex items-center gap-3">
                          {/* <img src={item.icon} alt="icon" /> */}
                          <span className="fw-medium">{item.title}</span>
                        </div>
                      </td>

                      <td>{item.date}</td>
                      <td>{item.history}</td>

                      <td>
                        <span
                          className={`${
                            item.status === "Successful"
                              ? "bg2-opty s1-color"
                              : item.status === "Pending"
                              ? "bg4-opty s2-color"
                              : item.status === "Canceled"
                              ? "bg5-opty s3-color"
                              : ""
                          } cus-border py-2 px-4 px-lg-5 w-100 text-center cus-rounded-2 `}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <div className="flex flex-column gap-1">
                          <span className="fw-medium">{item.amount}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
              {/* Pagination */}
              <div className="table-bottom  flex items-center justify-between mt-5 mt-lg-6 flex-wrap gap-6 row-gap-3">
                <p>Showing 1 to 10 of 500 entries</p>
                <nav aria-label="Page navigation">
                  <ul className="pagination flex items-center gap-2">
                    <li className="page-item btn_box btn_alt box_10 cus-border border-color">
                      <a className="page-link d-center">
                        <FaChevronLeft />
                      </a>
                    </li>

                    <li className="page-item btn_box box_10 cus-border border-color">
                      <a className="page-link d-center">1</a>
                    </li>

                    <li className="page-item btn_box btn_alt box_10 cus-border border-color">
                      <a className="page-link d-center">2</a>
                    </li>

                    <li className="page-item btn_box btn_alt box_10 cus-border border-color">
                      <a className="page-link d-center">
                        <span className="text-3xl">...</span>
                      </a>
                    </li>

                    <li className="page-item btn_box btn_alt box_10 cus-border border-color">
                      <a className="page-link d-center">5</a>
                    </li>

                    <li className="page-item btn_box box_10 cus-border border-color">
                      <a className="page-link d-center">
                        <FaChevronRight />
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
          </div>
        </div>
      </div>
    </>
  );
}
