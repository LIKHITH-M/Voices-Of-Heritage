import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_AI_PLANNER_API_URL || '/api';

const TicketVerificationPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        setLoading(true);
        // Primary: unified backend verification endpoint (checks persistent Booking + Ticket DB)
        const response = await axios.get(`${API_BASE_URL}/tickets/verify/${encodeURIComponent(ticketId!)}`);
        if (response.data.success && response.data.ticket) {
          setTicket(response.data.ticket);
        } else {
          setError('Ticket not found in our database.');
        }
      } catch (err: any) {
        // Fallback: check /api/bookings/verify/:id directly
        try {
          const fallback = await axios.get(`${API_BASE_URL}/bookings/verify/${encodeURIComponent(ticketId!)}`);
          if (fallback.data.booking || fallback.data.ticket) {
            setTicket(fallback.data.booking || fallback.data.ticket);
          } else {
            setError(fallback.data.reason || 'Ticket not found.');
          }
        } catch (err2: any) {
          setError(err.response?.data?.message || err2.response?.data?.reason || 'Ticket not found in persistent database.');
        }
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
          <p className="text-neutral-400">Validating ticket against database...</p>
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
          <p className="text-neutral-400 mb-6">{error || 'This ticket could not be found in our persistent records.'}</p>
          <Link to="/" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-2 rounded-lg transition-colors">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const paymentStatus = ticket.paymentStatus || 'paid';
  const isPaid = paymentStatus === 'paid';
  const isScanned = ticket.status === 'scanned' || ticket.ticketStatus === 'scanned';
  const isCancelled = ticket.status === 'cancelled' || ticket.ticketStatus === 'cancelled' || paymentStatus === 'cancelled';

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-xl p-8 relative overflow-hidden">
        {/* Verification Status Badge */}
        <div className="absolute top-4 right-4">
          {isScanned ? (
            <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Scanned / Used
            </span>
          ) : isCancelled ? (
            <span className="bg-neutral-700/40 text-neutral-300 border border-neutral-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Cancelled
            </span>
          ) : !isPaid ? (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Payment {paymentStatus}
            </span>
          ) : (
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              Active / Valid
            </span>
          )}
        </div>

        <div className="text-center mb-8 border-b border-neutral-800 pb-6">
          <span className="text-4xl mb-2 block">🎟️</span>
          <h1 className="text-xl font-bold text-amber-500">Official Ticket Verification</h1>
          <p className="text-neutral-400 text-sm">Verified against Voices of Heritage Persistent Database</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Ticket / Booking ID</span>
            <span className="font-mono text-white text-sm">{ticket.ticketId || ticket.bookingId}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Visitor Name</span>
            <span className="font-semibold text-white">{ticket.visitorName}</span>
          </div>
          {ticket.email && (
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Email</span>
              <span className="font-medium text-white">{ticket.email}</span>
            </div>
          )}
          {ticket.phone && (
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Phone</span>
              <span className="font-medium text-white">{ticket.phone}</span>
            </div>
          )}
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Monument / Event</span>
            <span className="font-semibold text-amber-500 text-right ml-4">{ticket.activityName || ticket.monumentName}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Site Location</span>
            <span className="font-medium text-white">{ticket.site}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Date & Slot</span>
            <span className="font-medium text-white">{ticket.visitDate} ({ticket.visitTime || ticket.timeSlot})</span>
          </div>
          {ticket.numTickets && (
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Visitors</span>
              <span className="font-medium text-white">{ticket.numTickets} ({ticket.ticketType === 'nri' ? 'NRI / Foreign' : 'Indian Citizen'})</span>
            </div>
          )}
          <div className="flex justify-between border-b border-neutral-800 pb-2">
            <span className="text-neutral-500">Payment Status</span>
            <span className={`font-bold uppercase text-sm ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
              {paymentStatus}
            </span>
          </div>
          {(ticket.razorpayPaymentId || ticket.transactionRef) && (
            <div className="flex justify-between border-b border-neutral-800 pb-2">
              <span className="text-neutral-500">Transaction Ref</span>
              <span className="font-mono text-xs text-neutral-300">{ticket.razorpayPaymentId || ticket.transactionRef}</span>
            </div>
          )}
          <div className="flex justify-between pb-2">
            <span className="text-neutral-500">Amount</span>
            <span className="font-bold text-emerald-400">
              {Number(ticket.totalINR ?? ticket.totalAmount ?? 0) === 0 ? 'FREE ENTRY' : `INR ${ticket.totalINR ?? ticket.totalAmount}`}
            </span>
          </div>
        </div>

        {isScanned && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
            ⚠️ This ticket was already verified and scanned on{' '}
            <strong>{ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleString() : 'earlier'}</strong>.
          </div>
        )}

        {!isPaid && !isScanned && (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 p-3 rounded-lg text-sm text-center">
            ⚠️ Entry cannot be granted until payment is completed (Current status: <strong>{paymentStatus}</strong>).
          </div>
        )}

        <div className="mt-8 text-center flex justify-center gap-3">
          <Link to="/bookings" className="inline-block bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold px-5 py-2 rounded-lg transition-colors">
            Bookings Portal
          </Link>
          <Link to="/" className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-5 py-2 rounded-lg transition-colors">
            Go to Platform
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TicketVerificationPage;
