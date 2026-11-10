import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';

// Ensure the API url is pulled correctly. We'll use the Render API or fallback to localhost.
const API_BASE_URL = import.meta.env.VITE_AI_PLANNER_API_URL 
  ? import.meta.env.VITE_AI_PLANNER_API_URL
  : 'http://localhost:5002/api';

interface ScannedHistoryItem {
  id: string;
  ticketId: string;
  visitorName: string;
  activityName: string;
  status: 'approved' | 'duplicate' | 'rejected';
  message: string;
  scannedAt: string;
}

const StaffPortalPage: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffInfo, setStaffInfo] = useState<{ name: string; staffId: string } | null>(null);

  // Active Tab: 'camera' | 'manual' | 'upload'
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'upload'>('camera');

  // Camera Scanner State
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Manual & File Upload Inputs
  const [manualTicketId, setManualTicketId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scan / Verification Status State
  const [scanStatus, setScanStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState('');
  const [ticketDetails, setTicketDetails] = useState<any>(null);
  const [history, setHistory] = useState<ScannedHistoryItem[]>([]);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [demoTicketId, setDemoTicketId] = useState<string | null>(null);

  // Check secure context on mount
  useEffect(() => {
    if (window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setIsSecureContext(false);
    }
  }, []);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets/staff/login`, {
        email: staffEmail,
        password: staffPassword,
      });
      if (response.data.success) {
        setIsAuthenticated(true);
        setStaffInfo({ name: response.data.name, staffId: response.data.staffId });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Login failed. Try staff@voicesofheritage.com / admin123');
    }
  };

  // Enumerate cameras when authenticated and camera tab is open
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'camera') {
      stopCameraScanner();
      return;
    }

    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          setSelectedCameraId(devices[0].id);
          setCameraError(null);
        } else {
          setCameraError('No video input devices (webcam/camera) were detected on this machine.');
        }
      })
      .catch((err) => {
        console.warn('Error fetching cameras:', err);
        handleCameraPermissionError(err);
      });

    return () => {
      stopCameraScanner();
    };
  }, [isAuthenticated, activeTab]);

  const handleCameraPermissionError = (err: any) => {
    const errorStr = (err?.message || err?.name || String(err)).toLowerCase();
    if (errorStr.includes('permission') || errorStr.includes('notallowederror')) {
      setCameraError(
        'Camera permission was denied. Please click the lock icon 🔒 in your browser address bar to allow camera access, then restart the scanner.'
      );
    } else if (errorStr.includes('notfounderror') || errorStr.includes('device')) {
      setCameraError('No camera found on this device. Please connect a webcam or use Manual Entry.');
    } else if (errorStr.includes('in use') || errorStr.includes('notreadableerror')) {
      setCameraError('Camera is already in use by another application. Please close it and retry.');
    } else {
      setCameraError(`Camera error: ${err?.message || 'Unable to access video stream.'}`);
    }
  };

  // Start Camera Scanning
  const startCameraScanner = async (cameraIdToUse?: string) => {
    setCameraError(null);
    const camId = cameraIdToUse || selectedCameraId;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-camera-view');
      }

      if (isCameraActive) {
        await html5QrCodeRef.current.stop();
        setIsCameraActive(false);
      }

      const cameraConfig = camId ? camId : { facingMode: 'environment' };

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleVerifyTicket(decodedText);
        },
        () => {
          // Continuous frame parsing error - ignore
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      handleCameraPermissionError(err);
      setIsCameraActive(false);
    }
  };

  // Stop Camera Scanning
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    setIsCameraActive(false);
  };

  // Core Ticket Verification Function (handles QR decode or manual input)
  const handleVerifyTicket = async (rawCode: string) => {
    let ticketIdToScan = rawCode.trim();
    if (!ticketIdToScan) return;

    // Try parsing if payload is JSON: { ticketId: '...' }
    try {
      const parsed = JSON.parse(ticketIdToScan);
      if (parsed.ticketId) {
        ticketIdToScan = parsed.ticketId;
      }
    } catch {
      // Raw string ID
    }

    setScanStatus('loading');
    setScanMessage(`Verifying ticket "${ticketIdToScan}"...`);

    try {
      const response = await axios.post(`${API_BASE_URL}/tickets/scan`, {
        ticketId: ticketIdToScan,
        staffId: staffInfo?.staffId || 'EMP-001',
      });

      const validatedTicket = response.data.ticket;
      setScanStatus('success');
      setScanMessage(response.data.message || 'Ticket verified successfully! Access granted.');
      setTicketDetails(validatedTicket);

      // Add to session history
      setHistory((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          ticketId: ticketIdToScan,
          visitorName: validatedTicket?.visitorName || 'Visitor',
          activityName: validatedTicket?.activityName || 'Heritage Activity',
          status: 'approved',
          message: 'Access Granted',
          scannedAt: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Error validating ticket.';
      const isDuplicate = errMsg.toLowerCase().includes('already');

      setScanStatus('error');
      setScanMessage(errMsg);
      setTicketDetails(null);

      // Add failure to history
      setHistory((prev) => [
        {
          id: `${Date.now()}_${Math.random()}`,
          ticketId: ticketIdToScan,
          visitorName: 'Unknown',
          activityName: 'Unknown',
          status: isDuplicate ? 'duplicate' : 'rejected',
          message: errMsg,
          scannedAt: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 19),
      ]);
    }
  };

  // Handle Manual Form Submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTicketId.trim()) return;
    handleVerifyTicket(manualTicketId);
  };

  // Handle Image File Upload (QR scanning from file)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanStatus('loading');
    setScanMessage('Scanning QR from uploaded image...');

    try {
      const tempScanner = new Html5Qrcode('qr-file-view');
      const decodedResult = await tempScanner.scanFile(file, true);
      tempScanner.clear();
      handleVerifyTicket(decodedResult);
    } catch (err: any) {
      setScanStatus('error');
      setScanMessage('Could not detect or decode a valid QR code in this image.');
      setTicketDetails(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Quick Demo / Test Ticket Generator
  const handleCreateDemoTicket = async () => {
    setIsGeneratingDemo(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/tickets/book`, {
        activity: {
          id: 'act_demo_virupaksha',
          name: 'Hampi Virupaksha Temple Guided Walk',
          site: 'Hampi',
        },
        form: {
          name: 'Priya Sharma (Sample Visitor)',
          email: 'priya.visitor@example.com',
          phone: '9876543210',
          visitDate: new Date().toISOString().split('T')[0],
          visitTime: '10:00 AM',
        },
        totalINR: 450,
      });

      if (response.data.success && response.data.ticket) {
        const tid = response.data.ticket.ticketId;
        setDemoTicketId(tid);
        setManualTicketId(tid);
        setActiveTab('manual');
        setScanStatus('idle');
        setScanMessage(`Demo ticket generated: ${tid}`);
      }
    } catch (err: any) {
      alert('Could not generate sample ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsGeneratingDemo(false);
    }
  };

  // Login view if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-3xl mb-4">
              🏛️
            </div>
            <h1 className="text-2xl font-bold text-amber-500 font-serif mb-1">Staff Verification Portal</h1>
            <p className="text-neutral-400 text-sm">Gate entry & ticket validation management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Staff Email
              </label>
              <input
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="staff@voicesofheritage.com"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Password
              </label>
              <input
                type="password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder="admin123"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-semibold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm"
            >
              Sign In to Gate Scanner
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center">
            <p className="text-xs text-neutral-500 mb-2">Default Staff Credentials for Demo:</p>
            <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800 text-xs font-mono text-neutral-300 flex justify-between items-center">
              <span>staff@voicesofheritage.com</span>
              <span className="text-amber-400">admin123</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-neutral-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏛️</span>
              <div>
                <h1 className="text-2xl font-bold font-serif text-amber-500">Gate Verification Station</h1>
                <p className="text-neutral-400 text-xs">
                  Active Officer: <span className="text-neutral-200 font-medium">{staffInfo?.name}</span> ({staffInfo?.staffId})
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleCreateDemoTicket}
              disabled={isGeneratingDemo}
              className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              title="Create a live test ticket to verify"
            >
              {isGeneratingDemo ? (
                <>
                  <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Create Demo Ticket</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                stopCameraScanner();
                setIsAuthenticated(false);
              }}
              className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3.5 py-2 rounded-xl transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Security Warning Banner if non-localhost non-HTTPS */}
        {!isSecureContext && (
          <div className="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-semibold mb-0.5">Insecure Connection Notice</p>
              <p className="text-amber-200/80">
                Live camera access requires <strong>HTTPS</strong> or <strong>localhost</strong>. If you are accessing this from a local network IP, browser camera access may be restricted by the browser. Please use the <strong>Manual Entry</strong> or <strong>Upload QR</strong> options below.
              </p>
            </div>
          </div>
        )}

        {/* Main Grid: Left = Scanner / Inputs, Right = Verification Results & Audit Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Verification Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Mode Selector Tabs */}
            <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
              <button
                onClick={() => {
                  setActiveTab('camera');
                  setCameraError(null);
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'camera'
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>📷</span>
                <span>Live Camera</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('manual');
                  stopCameraScanner();
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'manual'
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>⌨️</span>
                <span>Manual Entry</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('upload');
                  stopCameraScanner();
                }}
                className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'upload'
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>📁</span>
                <span>Upload QR</span>
              </button>
            </div>

            {/* TAB 1: LIVE CAMERA SCANNER */}
            {activeTab === 'camera' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-semibold text-base text-white">Live Camera Scanner</h2>
                    <p className="text-xs text-neutral-400">Position the visitor's QR code within the frame</p>
                  </div>
                  {isCameraActive && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      Scanner Active
                    </span>
                  )}
                </div>

                {/* Camera Selector Dropdown (if multiple cameras available) */}
                {cameras.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-xs text-neutral-400 mb-1">Select Camera Device</label>
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedCameraId(newId);
                        if (isCameraActive) {
                          startCameraScanner(newId);
                        }
                      }}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                    >
                      {cameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Camera ${cam.id.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Viewfinder Container */}
                <div className="relative bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 min-h-[300px] flex items-center justify-center">
                  <div id="qr-camera-view" className="w-full max-w-[340px] overflow-hidden rounded-lg"></div>

                  {!isCameraActive && !cameraError && (
                    <div className="text-center p-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-neutral-800/80 flex items-center justify-center mx-auto text-2xl text-amber-400 border border-neutral-700">
                        📹
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Camera is Currently Idle</p>
                        <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                          Click below to start video stream and scan tickets in real-time.
                        </p>
                      </div>
                      <button
                        onClick={() => startCameraScanner()}
                        className="bg-amber-600 hover:bg-amber-500 text-neutral-950 font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-xs"
                      >
                        Start Camera Scanner
                      </button>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-6 text-center max-w-sm space-y-3">
                      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto text-xl">
                        ⚠️
                      </div>
                      <h3 className="text-sm font-semibold text-red-400">Camera Access Issue</h3>
                      <p className="text-xs text-neutral-400 leading-relaxed">{cameraError}</p>
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          onClick={() => startCameraScanner()}
                          className="bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-4 py-2 rounded-lg border border-neutral-700 transition-colors"
                        >
                          Retry Camera Access
                        </button>
                        <button
                          onClick={() => setActiveTab('manual')}
                          className="text-amber-400 hover:underline text-xs"
                        >
                          Switch to Manual Ticket Entry →
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Camera Controls Bar */}
                {isCameraActive && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-neutral-400">Position QR code inside the box</p>
                    <button
                      onClick={stopCameraScanner}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                      Stop Camera
                    </button>
                  </div>
                )}

                {/* Camera Troubleshooting Helper */}
                <div className="mt-6 p-3.5 bg-neutral-950/60 rounded-xl border border-neutral-800/80 text-xs text-neutral-400 space-y-1">
                  <p className="font-semibold text-neutral-300">💡 Camera Troubleshooting Tips:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-neutral-400 text-[11px]">
                    <li>Click the lock icon (🔒) in the URL bar to verify camera permission is set to <strong>Allow</strong>.</li>
                    <li>If on macOS, check <strong>System Settings → Privacy & Security → Camera</strong> and allow your browser.</li>
                    <li>If testing without a camera, switch to the <strong>Manual Entry</strong> or <strong>Upload QR</strong> tab.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* TAB 2: MANUAL TICKET ID ENTRY */}
            {activeTab === 'manual' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                <div className="mb-4">
                  <h2 className="font-semibold text-base text-white">Manual Ticket Validation</h2>
                  <p className="text-xs text-neutral-400">
                    Type or paste the alphanumeric Ticket ID displayed on the visitor's pass
                  </p>
                </div>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Ticket ID / Reference Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualTicketId}
                        onChange={(e) => setManualTicketId(e.target.value.toUpperCase())}
                        placeholder="e.g. VOH-173000-ABCDE"
                        className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white font-mono placeholder-neutral-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all text-sm uppercase"
                        required
                      />
                      {manualTicketId && (
                        <button
                          type="button"
                          onClick={() => setManualTicketId('')}
                          className="absolute right-3 top-3 text-neutral-500 hover:text-neutral-300 text-xs"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!manualTicketId.trim() || scanStatus === 'loading'}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-neutral-950 font-semibold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 text-xs flex items-center justify-center gap-2"
                  >
                    {scanStatus === 'loading' ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying with Database...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Verify & Check In Visitor</span>
                      </>
                    )}
                  </button>
                </form>

                {demoTicketId && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex items-center justify-between">
                    <span className="text-amber-400">Generated Demo ID: <strong>{demoTicketId}</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualTicketId(demoTicketId);
                        handleVerifyTicket(demoTicketId);
                      }}
                      className="bg-amber-500 text-neutral-950 font-semibold px-2.5 py-1 rounded text-[11px]"
                    >
                      Verify Now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: UPLOAD QR IMAGE FILE */}
            {activeTab === 'upload' && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
                <div className="mb-4">
                  <h2 className="font-semibold text-base text-white">Upload QR Code Image</h2>
                  <p className="text-xs text-neutral-400">
                    Upload a screenshot or photo of the visitor's QR code
                  </p>
                </div>

                {/* Hidden container for file-based scanner */}
                <div id="qr-file-view" style={{ display: 'none' }}></div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-2xl p-8 text-center cursor-pointer bg-neutral-950/40 hover:bg-neutral-950/80 transition-all space-y-3"
                >
                  <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center mx-auto text-2xl text-amber-400 border border-neutral-700">
                    📂
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Click to select QR image file</p>
                    <p className="text-xs text-neutral-500">Supports PNG, JPG, JPEG, WEBP</p>
                  </div>
                  <button
                    type="button"
                    className="inline-block bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-4 py-2 rounded-lg border border-neutral-700 pointer-events-none"
                  >
                    Browse Files
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Right Column: Validation Status & Audit Log (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Verification Result Box */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
              <h2 className="font-semibold text-base mb-4 text-white">Validation Status</h2>

              {scanStatus === 'idle' && (
                <div className="flex flex-col items-center justify-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl bg-neutral-950/30">
                  <span className="text-4xl mb-3 opacity-60">🎫</span>
                  <p className="text-xs font-medium">Ready for validation</p>
                  <p className="text-[11px] text-neutral-600 mt-1">Scan a QR code or enter a Ticket ID</p>
                </div>
              )}

              {scanStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center py-12 text-amber-400 border border-neutral-800 rounded-xl bg-neutral-950/30 space-y-3">
                  <div className="animate-spin h-8 w-8 border-3 border-amber-500 border-t-transparent rounded-full"></div>
                  <p className="text-xs font-medium">{scanMessage || 'Verifying ticket...'}</p>
                </div>
              )}

              {scanStatus === 'success' && ticketDetails && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center">
                    <span className="text-3xl block mb-1">✅</span>
                    <h3 className="font-bold text-emerald-400 text-sm">ACCESS GRANTED</h3>
                    <p className="text-xs text-emerald-300/80 mt-0.5">{scanMessage}</p>
                  </div>

                  <div className="space-y-2.5 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
                    <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-neutral-500">Visitor Name</span>
                      <span className="font-semibold text-white">{ticketDetails.visitorName}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-neutral-500">Activity</span>
                      <span className="font-semibold text-amber-400 text-right ml-4">
                        {ticketDetails.activityName}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-neutral-500">Heritage Site</span>
                      <span className="font-medium text-white">{ticketDetails.site || 'Heritage Monument'}</span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-neutral-500">Date & Schedule</span>
                      <span className="font-medium text-white">
                        {ticketDetails.visitDate} ({ticketDetails.visitTime})
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-neutral-800/80 pb-2">
                      <span className="text-neutral-500">Paid Amount</span>
                      <span className="font-medium text-emerald-400 font-mono">₹{ticketDetails.totalINR}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-neutral-500">Ticket ID</span>
                      <span className="font-mono text-white text-[11px] bg-neutral-800 px-2 py-0.5 rounded">
                        {ticketDetails.ticketId}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {scanStatus === 'error' && (
                <div className="animate-fade-in bg-red-500/10 border border-red-500/30 p-5 rounded-xl text-center space-y-2">
                  <span className="text-3xl block">❌</span>
                  <h3 className="font-bold text-red-400 text-sm">ACCESS REJECTED</h3>
                  <p className="text-xs text-red-300 leading-relaxed">{scanMessage}</p>
                </div>
              )}
            </div>

            {/* Session Audit Log */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-white">Session Scans Log</h2>
                <span className="text-[11px] text-neutral-500">{history.length} scans</span>
              </div>

              {history.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-6">No scan activity recorded yet this session.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {item.status === 'approved' && '✅'}
                          {item.status === 'duplicate' && '⚠️'}
                          {item.status === 'rejected' && '❌'}
                        </span>
                        <div>
                          <p className="font-medium text-neutral-200 text-[11px]">{item.visitorName}</p>
                          <p className="font-mono text-[10px] text-neutral-500">{item.ticketId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                            item.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : item.status === 'duplicate'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {item.status}
                        </span>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{item.scannedAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPortalPage;
