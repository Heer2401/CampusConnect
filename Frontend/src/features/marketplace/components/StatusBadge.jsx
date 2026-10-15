import React from 'react';

const statusMap = {
  active: { label: 'Active', className: 'pill-green' },
  draft: { label: 'Draft', className: 'pill-gray' },
  pending_approval: { label: 'Pending Approval', className: 'pill-yellow' },
  reserved: { label: 'Reserved', className: 'pill-yellow' },
  sold: { label: 'Sold', className: 'pill-blue' },
  rented: { label: 'Rented', className: 'pill-blue' },
  exchanged: { label: 'Exchanged', className: 'pill-blue' },
  given_away: { label: 'Given Away', className: 'pill-purple' },
  rejected: { label: 'Rejected', className: 'pill-red' },
  archived: { label: 'Archived', className: 'pill-gray' },
};

export const StatusBadge = ({ status }) => {
  const conf = statusMap[status] || { label: status, className: 'pill-gray' };
  return (
    <span className={`pill ${conf.className}`}>
      {conf.label}
    </span>
  );
};
