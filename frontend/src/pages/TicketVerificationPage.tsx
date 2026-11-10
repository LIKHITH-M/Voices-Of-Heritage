import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_AI_PLANNER_API_URL 
  ? import.meta.env.VITE_AI_PLANNER_API_URL
  : 'http://localhost:5002/api';

const TicketVerificationPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/tickets/verify/${ticketId}`);
        if (response.data.success) {
          setTicket(response.data.ticket);
        } else {
          setError('Ticket not found.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error fetching ticket details.');
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-400">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center">
          <span className="text-5xl mb-4 block">🎫</span>
          <h1 className="text-xl font-bold text-red-500 mb-2">Invalid Ticket</h1>
          <p className="text-neutral-400 mb-6">{error || 'This ticket could not be found in our records.'}</p>
          <Link to="/" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 relative overflow-hidden">
        {/* Verification Status Badge */}
        <div className="absolute top-4 right-4">
          {ticket.status === 'scanned' ? (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Scanned / Used
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Active / Valid
            </span>
          )}
        </div>

        <div className="text-center mb-8 border-b border-neutral-800 pb-6">
          <span className="text-4xl mb-2 block">🎟️</span>
          <h1 className="text-xl font-bold text-amber-500">Ticket Verification</h1>
          <p className="text-neutral-400 text-sm">Official Voices of Heritage Digital Receipt</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Visitor Name</span>
            <span className="font-semibold text-white">{ticket.visitorName}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Email</span>
            <span className="font-medium text-white">{ticket.email}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Phone</span>
            <span className="font-medium text-white">{ticket.phone}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Monument / Event</span>
            <span className="font-semibold text-amber-500 text-right ml-4">{ticket.activityName}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Site Location</span>
            <span className="font-medium text-white">{ticket.site}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Date & Slot</span>
            <span className="font-medium text-white">{ticket.visitDate} ({ticket.visitTime})</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Ticket ID</span>
            <span className="font-mono text-white text-sm">{ticket.ticketId}</span>
          </div>
          <div className="flex justify-between pb-2">
            <span className="text-neutral-500">Paid Amount</span>
            <span className="font-bold text-emerald-400">INR {ticket.totalINR}</span>
          </div>
        </div>

        {ticket.status === 'scanned' && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
            ⚠️ This ticket was already verified and scanned on{' '}
            <strong>{new Date(ticket.scannedAt).toLocaleString()}</strong>.
          </div>
        )}

        <div className="mt-8 text-center">
          <Link to="/" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Go to Platform
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TicketVerificationPage;
