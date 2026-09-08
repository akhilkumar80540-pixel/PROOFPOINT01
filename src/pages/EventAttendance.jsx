import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Users, 
  Download, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  ArrowLeft, 
  Loader2, 
  ExternalLink,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { ethers } from 'ethers';
import { buildMerkleTree } from '../utils/merkleUtils';

// ==========================================
// CONTRACT ADDRESS & ABI CONFIGURATION
// ==========================================
const CONTRACT_ADDRESS = "0xa8a382A1F2D9cFB2978F86f496483B91c01cAC50";
const CONTRACT_ABI = [
  "function anchorEventBatch(string memory eventId, bytes32 merkleRoot, uint256 totalAttendees) external",
  "function verifyProofMembership(string memory eventId, bytes32 leafHash, bytes32[] memory proof) external view returns (bool)"
];

export default function EventAttendance() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchoring, setAnchoring] = useState(false);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let unsubscribeProofs = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Event Info & Validate Ownership
        const q = query(collection(db, "events"), where("eventId", "==", eventId));
        const snap = await getDocs(q);

        if (snap.empty) {
          setLoading(false);
          return;
        }

        const data = snap.docs[0].data();
        setEventData(data);

        // Security check: Only allow the event organizer
        if (data.organizerId && data.organizerId !== user.uid) {
          setUnauthorized(true);
          setLoading(false);
          return;
        }

        // 2. Real-time listener for Attendees (Proofs for this event)
        const proofsQuery = query(collection(db, "proofs"), where("eventId", "==", eventId));
        unsubscribeProofs = onSnapshot(proofsQuery, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setAttendees(list);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error fetching event:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProofs();
    };
  }, [eventId]);

  // Export attendance data as CSV
  const handleExportCSV = () => {
    if (attendees.length === 0) {
      alert("No attendance records to export.");
      return;
    }

    const headers = ["Identifier", "Attendee Name", "Timestamp", "Distance (Meters)", "Proof ID", "Blockchain TxHash"];
    const rows = attendees.map(a => [
      `"${a.identifier || a.rollNumber || a.attendeeId || ''}"`,
      `"${a.attendeeName || a.studentName || 'Attendee'}"`,
      `"${new Date(a.timestamp).toLocaleString()}"`,
      a.distanceMeters || 0,
      `"${a.proofId || ''}"`,
      `"${a.blockchainTxHash || 'Pending'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${eventId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Automated Batch Merkle Anchor Function
  const handleBatchAnchor = async () => {
    const pendingAttendees = attendees.filter(a => !a.blockchainTxHash);

    if (pendingAttendees.length === 0) {
      alert("All attendees are already anchored on-chain!");
      return;
    }

    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install MetaMask to anchor on-chain.");
      return;
    }

    setAnchoring(true);
    try {
      // 1. Ensure wallet is switched to Sepolia (Chain ID 11155111 / 0xaa36a7)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        }
      }

      // 2. Request user account directly without BrowserProvider
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = accounts[0];

      // 3. Build Merkle Tree for un-anchored attendees
      const treeData = buildMerkleTree(pendingAttendees);
      if (!treeData) throw new Error("Could not construct Merkle Tree.");
      const root = treeData.tree.getHexRoot();

      // 4. Encode contract function calldata using Ethers Interface
      const iface = new ethers.Interface(CONTRACT_ABI);
      const data = iface.encodeFunctionData("anchorEventBatch", [
        eventId,
        root,
        pendingAttendees.length,
      ]);

      // 5. Send raw transaction directly to MetaMask
      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: userAddress,
            to: CONTRACT_ADDRESS,
            data: data,
            gas: "0x30D40",
          },
        ],
      });

      // 6. Wait for block confirmation using an independent public Sepolia node
      const directProvider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      await directProvider.waitForTransaction(txHash, 1);

      // 7. Update all pending attendee documents in Firestore
      const updatePromises = pendingAttendees.map((attendee) => {
        const attendeeRef = doc(db, "proofs", attendee.id);
        return updateDoc(attendeeRef, {
          blockchainTxHash: txHash,
          merkleRoot: root,
          anchoredOnChain: true,
          anchoredAt: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);
      alert(`Batch anchored ${pendingAttendees.length} records successfully! Tx: ${txHash.slice(0, 10)}...`);
    } catch (err) {
      console.error("Batch anchoring failed:", err);
      alert("Anchoring failed: " + (err.reason || err.message));
    } finally {
      setAnchoring(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white border border-gray-200 rounded-2xl shadow-sm text-center">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-full mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-600 mb-6">
          Only the organizer of this event can view attendee rosters, export records, and anchor proofs.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const pendingCount = attendees.filter(a => !a.blockchainTxHash).length;
  const isOrganizer = currentUser && eventData && (!eventData.organizerId || eventData.organizerId === currentUser.uid);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-xs text-primary hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            {eventData ? eventData.name : 'Event Attendance'}
          </h1>
          <p className="text-xs text-gray-500 font-mono">Event ID: {eventId}</p>
        </div>

        {isOrganizer && (
          <div className="flex items-center gap-3">
            {/* Batch Anchor Button */}
            <button
              onClick={handleBatchAnchor}
              disabled={anchoring || pendingCount === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
            >
              {anchoring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Anchoring Batch...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" /> Anchor Batch ({pendingCount})
                </>
              )}
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Verified Attendees</div>
          <div className="text-3xl font-bold text-gray-900">{attendees.length}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Allowed Radius</div>
          <div className="text-3xl font-bold text-indigo-600">{eventData?.radiusMeters || 200}m</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Blockchain Anchored</div>
          <div className="text-3xl font-bold text-green-600">
            {attendees.filter(a => a.blockchainTxHash).length} / {attendees.length}
          </div>
        </div>
      </div>

      {/* Attendees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Live Verified Roster
          </h2>
          <span className="text-xs text-gray-400">Updates live automatically</span>
        </div>

        {attendees.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No attendees have checked in yet. Share the event link or QR code to begin!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                <tr>
                  <th className="px-6 py-3">Identifier</th>
                  <th className="px-6 py-3">Attendee Name</th>
                  <th className="px-6 py-3">Distance Verified</th>
                  <th className="px-6 py-3">Time Checked-in</th>
                  <th className="px-6 py-3">Proof / Blockchain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      {attendee.identifier || attendee.rollNumber || attendee.attendeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {attendee.attendeeName || attendee.studentName || 'Attendee'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        {attendee.distanceMeters !== undefined ? `${attendee.distanceMeters}m away` : 'Verified'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {attendee.timestamp
                        ? new Date(attendee.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recorded'}
                    </td>
                    <td className="px-6 py-4">
                      {attendee.blockchainTxHash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${attendee.blockchainTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200 hover:underline"
                          title={attendee.blockchainTxHash}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                          Tx: {attendee.blockchainTxHash.substring(0, 10)}...
                          <ExternalLink className="w-3 h-3 ml-0.5 text-green-600" />
                        </a>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-mono">
                          Pending Anchor
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}