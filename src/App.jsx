import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DailyLogPage from './components/DailyLog/DailyLogPage';
import MembersPage from './components/Members/MembersPage';
import PaymentsPage from './components/Payments/PaymentsPage';
import PricesPage from './components/Prices/PricesPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('daily-log');
  const [jumpToMemberId, setJumpToMemberId] = useState(null);

  function handleMemberClick(memberId) {
    setJumpToMemberId(memberId);
    setCurrentPage('members');
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    if (page !== 'members') setJumpToMemberId(null);
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar currentPage={currentPage} setCurrentPage={handlePageChange} />
      <main className="flex-1 overflow-hidden">
        {currentPage === 'daily-log' && <DailyLogPage onMemberClick={handleMemberClick} />}
        {currentPage === 'members' && (
          <MembersPage
            jumpToMemberId={jumpToMemberId}
            onClearJump={() => setJumpToMemberId(null)}
          />
        )}
        {currentPage === 'payments' && <PaymentsPage />}
        {currentPage === 'prices' && <PricesPage />}
      </main>
    </div>
  );
}
