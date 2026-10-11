/**
 * @file Meeting.tsx
 * @description Meeting pipeline list, create, and detail views.
 * @author Aryan Sharma <aryan.sharma@dgtoohl.com>
 * @date 2026-05-25
 */

import React, { useState, useEffect } from 'react';
import { fetchMeetings } from '../../services/Meeting';
import type { Meeting as ApiMeeting } from '../../services/Meeting';
import { useNavigate } from 'react-router-dom';
import MasterView from '../../components/ui/MasterView';
import Pagination from '../../components/ui/Pagination';
import Table, { type Column } from '../../components/ui/Table';

import MasterHeader from '../../components/ui/MasterHeader';
import SearchBar from '../../components/ui/SearchBar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import AttendeesModal from '../../components/ui/AttendeesModal';
import { usePermissions } from '../../hooks/SidebarMenuHooks';
import TableHeader from '../../components/ui/TableHeader';

// Dummy data and functions for Meeting pipeline (replace with real API calls)

const MeetingPipeline: React.FC = () => {
  const [attendeesModal, setAttendeesModal] = useState<{ open: boolean; attendees: ApiMeeting['attendees'] }>({ open: false, attendees: [] });
  const handleAttendeesClick = (attendees: ApiMeeting['attendees']) => {
    setAttendeesModal({ open: true, attendees });
  };
  const closeAttendeesModal = () => setAttendeesModal({ open: false, attendees: [] });
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<ApiMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate] = useState(false);
  const [viewItem, setViewItem] = useState<ApiMeeting | null>(null);
  const [editItem] = useState<ApiMeeting | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    // Fetch meetings from API
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: Record<string, any> = {
          page: currentPage,
          per_page: itemsPerPage,
        };
        if (searchQuery) params.search = searchQuery;
        const res = await fetchMeetings(params);
        setMeetings(res.data);
        setTotalItems(res.meta.pagination.total);
      } catch {
        // Optionally handle error
        void 0;
      }
      setLoading(false);
    };
    fetchData();
  }, [currentPage, itemsPerPage, searchQuery]);

  const handleCreate = () => {
    navigate('/meeting-schedule');
  };
  const handleEdit = (id: number) => {
    navigate(`/meeting/${id}/edit`);
  };
  const handleView = (id: number) => setViewItem(meetings.find(m => m.id === id) || null);
  const handleDelete = (id: number) => setConfirmDeleteId(id);
  const confirmDelete = async () => {
    // TODO: Wire delete API here
    if (!confirmDeleteId) return;
    setConfirmLoading(true);
    // Simulate delete locally for now
    setMeetings(prev => prev.filter(m => m.id !== confirmDeleteId));
    setTotalItems(prev => Math.max(0, prev - 1));
    setConfirmLoading(false);
    setConfirmDeleteId(null);
  };
  const handlePageChange = (page: number) => setCurrentPage(page);

  return (
    <>
      <div className="flex-1 w-full max-w-full overflow-x-hidden">
        {showCreate ? (
          <div className="p-4 bg-white rounded-lg">Meeting Create Form (TODO)</div>
        ) : viewItem ? (
          <MasterView item={viewItem} onClose={() => setViewItem(null)} />
        ) : editItem ? (
          <div className="p-4 bg-white rounded-lg">Meeting Edit Form (TODO)</div>
        ) : (
          <>
            {hasPermission('meeting.create') && (
              <MasterHeader
                onCreateClick={handleCreate}
                createButtonLabel="Create Meeting"
              />
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Table Header */}
              <TableHeader title='Meeting Pipeline'>
                <SearchBar delay={0} placeholder="Search Meeting" onSearch={(q: string) => { setSearchQuery(q); setCurrentPage(1); }} />
              </TableHeader>


              <div className="pt-0 overflow-visible">
                <Table
                  data={meetings}
                  startIndex={0}
                  loading={loading}
                  desktopOnMobile={true}
                  keyExtractor={(it: ApiMeeting, idx: number) => `${it.id}-${idx}`}
                  columns={([
                    { key: 'id', header: 'Id', render: (it: ApiMeeting) => `#${it.id}` },
                    { key: 'title', header: 'Title', render: (it: ApiMeeting) => it.title },
                    { key: 'lead_name', header: 'Lead Name', render: (it: ApiMeeting) => it.lead ? `${it.lead.name} #${it.lead.id}` : '-' },
                    {
                      key: 'attendees', header: 'Attendees', render: (it: ApiMeeting) => (
                        <span
                          style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                          onClick={() => handleAttendeesClick(it.attendees)}
                        >
                          {it.attendees?.length ?? 0}
                        </span>
                      )
                    },
                    { key: 'type', header: 'Type', render: (it: ApiMeeting) => it.type },
                    { key: 'location', header: 'Location', render: (it: ApiMeeting) => it.location || '-' },
                    { key: 'agenda', header: 'Agenda', render: (it: ApiMeeting) => it.agenda },
                    { key: 'meetin_start_date', header: 'Start Date', render: (it: ApiMeeting) => it.meetin_start_date || '-' },
                    { key: 'meetin_end_date', header: 'End Date', render: (it: ApiMeeting) => it.meetin_end_date || '-' },
                  ] as Column<ApiMeeting>[])}
                  onEdit={(it: ApiMeeting) => handleEdit(it.id)}
                  onView={(it: ApiMeeting) => handleView(it.id)}
                  onDelete={(it: ApiMeeting) => handleDelete(it.id)}
                />
              </div>
            </div>
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
            <ConfirmDialog
              isOpen={!!confirmDeleteId}
              title="Delete this meeting?"
              message="This action will permanently remove the meeting. This cannot be undone."
              confirmLabel="Delete"
              cancelLabel="Cancel"
              loading={confirmLoading}
              onCancel={() => setConfirmDeleteId(null)}
              onConfirm={confirmDelete}
            />
          </>
        )}
      </div>
      <AttendeesModal
        isOpen={attendeesModal.open}
        attendees={attendeesModal.attendees}
        onClose={closeAttendeesModal}
        title="Meeting Attendees"
      />
    </>
  );
};

export default MeetingPipeline;
// ...existing code...
