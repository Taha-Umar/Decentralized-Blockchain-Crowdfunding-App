import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import kycAbi from './abis/KYCRegistry_Taha.json';
import crowdAbi from './abis/Crowdfunding_Taha.json';

// !!! PASTE YOUR TWO CURRENT ADDRESSES HERE !!!
const KYC_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 
const CROWDFUNDING_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

function App() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [adminAddress, setAdminAddress] = useState(""); 
  const [campaigns, setCampaigns] = useState([]);
  
  // Form States
  const [kycName, setKycName] = useState("");
  const [kycCnic, setKycCnic] = useState("");
  const [userToApprove, setUserToApprove] = useState(""); 
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x7a69' }] });
      await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const b = await provider.getBalance(accounts[0]);
      setBalance(ethers.formatEther(b));
    } catch (e) { console.error(e); }
  };

  // Listen for account changes without refreshing the page
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          provider.getBalance(accounts[0]).then(b => setBalance(ethers.formatEther(b)));
        } else {
          setAccount(null);
        }
      });
    }
  }, []);

  const loadCampaigns = async () => {
    if (!account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdAbi.abi, provider);
      
      const contractAdmin = await contract.admin();
      setAdminAddress(contractAdmin.toLowerCase());

      const count = await contract.campaignCount();
      const temp = [];
      
      for (let i = 0; i < Number(count); i++) {
        const c = await contract.campaigns(i);
        if (c[0] !== "") {
          temp.push({ 
            id: i, 
            title: c[0], 
            goal: ethers.formatEther(c[2]), 
            raised: ethers.formatEther(c[3]),
            // NEW: Fetching the creator and status from your struct!
            creator: c[4].toLowerCase(),
            status: Number(c[5]) // 0: Active, 1: Completed, 2: Withdrawn
          });
        }
      }
      setCampaigns(temp);
    } catch (err) { console.error("Load Error:", err); }
  };

  useEffect(() => { if(account) loadCampaigns(); }, [account]);

  // --- KYC & ADMIN FUNCTIONS ---
  const submitKYC = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(KYC_ADDRESS, kycAbi.abi, signer);
      const tx = await contract.submitKYC(kycName, kycCnic);
      await tx.wait();
      alert("KYC Submitted! Waiting for Admin approval.");
    } catch (e) { alert("Failed. You might already be pending or verified."); }
  };

  const approveUser = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(KYC_ADDRESS, kycAbi.abi, signer);
      const tx = await contract.approveKYC(userToApprove); 
      await tx.wait();
      alert("User successfully approved!");
    } catch (e) { alert("Approval failed! Ensure you are the Admin."); }
  };

  const checkMyStatus = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(KYC_ADDRESS, kycAbi.abi, provider);
      const isVerified = await contract.checkKycStatus(account); 
      if (isVerified) alert("Blockchain says: You ARE Verified! ✅");
      else alert("Blockchain says: NOT Verified ❌");
    } catch (e) { console.error(e); }
  };

  // --- CROWDFUNDING FUNCTIONS ---
  const createCamp = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdAbi.abi, signer);
      const tx = await contract.createCampaign(title, "Description", ethers.parseEther(goal));
      await tx.wait();
      alert("Campaign Created!");
      loadCampaigns();
    } catch (e) { alert("FAILED: You are not a verified user."); }
  };

  const contributeToCamp = async (campaignId, goalAmount, raisedAmount) => {
    const remaining = Number(goalAmount) - Number(raisedAmount);
    const amount = prompt(`Enter amount in ETH (Max allowed: ${remaining} ETH):`);
    
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;
    if (Number(amount) > remaining) return alert(`Error: You cannot contribute more than ${remaining} ETH!`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdAbi.abi, signer);
      const tx = await contract.contribute(campaignId, { value: ethers.parseEther(amount) });
      await tx.wait();
      alert("Contribution Successful!");
      
      // Update balance & campaigns instantly
      const b = await provider.getBalance(account);
      setBalance(ethers.formatEther(b));
      loadCampaigns(); 
    } catch (e) { alert("Contribution failed."); }
  };

  // NEW: Withdraw Funds Logic
  const withdrawFunds = async (campaignId) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdAbi.abi, signer);
      const tx = await contract.withdrawFunds(campaignId);
      await tx.wait();
      alert("Funds successfully withdrawn to your wallet! 💸");
      
      // Update balance & campaigns instantly
      const b = await provider.getBalance(account);
      setBalance(ethers.formatEther(b));
      loadCampaigns();
    } catch (e) { 
      console.error(e);
      alert("Withdrawal failed. Make sure you are the creator and the goal is reached."); 
    }
  };

  const deleteCamp = async (campaignId) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CROWDFUNDING_ADDRESS, crowdAbi.abi, signer);
      const tx = await contract.deleteCampaign(campaignId);
      await tx.wait();
      alert("Campaign Deleted!");
      loadCampaigns(); 
    } catch (e) { alert("Delete failed! Only the Admin can do this."); }
  };

  return (
    <div className="app-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
        .app-container { max-width: 1100px; margin: 0 auto; padding: 40px 20px; }
        
        h1 { font-size: 2.5rem; font-weight: 700; text-align: center; margin-bottom: 5px; background: -webkit-linear-gradient(45deg, #60a5fa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { text-align: center; color: #94a3b8; margin-bottom: 40px; font-weight: 500; }
        h3 { font-size: 1.5rem; border-bottom: 1px solid #334155; padding-bottom: 10px; margin-top: 40px; }
        h4 { margin: 0 0 15px 0; font-size: 1.1rem; color: #e2e8f0; }
        
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .admin-card { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
        
        input { width: 100%; padding: 12px; margin-bottom: 15px; background: #0f172a; border: 1px solid #475569; border-radius: 8px; color: white; font-size: 0.95rem; box-sizing: border-box; transition: 0.2s; }
        input:focus { outline: none; border-color: #60a5fa; box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2); }
        
        button { padding: 10px 16px; border-radius: 8px; border: none; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; justify-content: center; }
        button:active { transform: scale(0.98); }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover:not(:disabled) { background: #2563eb; }
        
        .btn-success { background: #10b981; color: white; width: 100%; }
        .btn-success:hover:not(:disabled) { background: #059669; }
        
        .btn-admin { background: #fbbf24; color: #1e293b; width: 100%; }
        .btn-admin:hover { background: #f59e0b; }
        
        .btn-secondary { background: #6366f1; color: white; }
        .btn-secondary:hover { background: #4f46e5; }
        
        .btn-danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444; }
        .btn-danger:hover { background: #ef4444; color: white; }

        .btn-withdraw { background: #8b5cf6; color: white; }
        .btn-withdraw:hover { background: #7c3aed; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .flex-row { display: flex; gap: 10px; }
        .campaign-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; margin-top: 20px; }
        
        .progress-bg { background: #334155; border-radius: 99px; height: 8px; width: 100%; margin: 15px 0; overflow: hidden; }
        .progress-fill { background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; border-radius: 99px; transition: width 0.4s ease; }
        
        .badge { background: #fbbf24; color: #000; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-left: 10px; }
        .wallet-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
        .text-gray { color: #94a3b8; font-size: 0.9rem; margin-top: 5px; }
        
        @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
      `}</style>

      <h1>Web3 Crowdfunding</h1>
      <p className="subtitle">Developed by Taha (22L-6706)</p>
      
      {!account ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <button className="btn-primary" onClick={connectWallet} style={{ padding: '15px 30px', fontSize: '1.1rem' }}>
            🚀 Connect MetaMask
          </button>
        </div>
      ) : (
        <div>
          <div className="card wallet-info">
            <div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', marginRight: '10px' }}>Connected:</span> 
                <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px' }}>{account.slice(0,6)}...{account.slice(-4)}</strong>
                {adminAddress === account.toLowerCase() && <span className="badge">Admin</span>}
              </div>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#10b981' }}>
              {Number(balance).toFixed(4)} ETH
            </div>
          </div>
          
          <div className="grid-2">
            <div className="card">
              <h4>🛡️ Submit KYC</h4>
              <input placeholder="Full Name" onChange={e => setKycName(e.target.value)} />
              <input placeholder="CNIC Number" onChange={e => setKycCnic(e.target.value)} />
              <div className="flex-row" style={{ marginBottom: '30px' }}>
                <button className="btn-primary" onClick={submitKYC} style={{ flex: 1 }}>Submit</button>
                <button className="btn-secondary" onClick={checkMyStatus}>Check Status</button>
              </div>
              
              <h4>🚀 Launch Campaign</h4>
              <input placeholder="Campaign Title" onChange={e => setTitle(e.target.value)} />
              <input placeholder="Funding Goal (in ETH)" type="number" step="0.01" onChange={e => setGoal(e.target.value)} />
              <button className="btn-success" onClick={createCamp}>Create Campaign</button>
            </div>

            <div className="card admin-card">
              <h4 style={{ color: '#fbbf24' }}>👑 Admin Controls</h4>
              <p className="text-gray" style={{ marginBottom: '20px' }}>Paste a user's wallet address below to approve their KYC request.</p>
              <input placeholder="0x..." onChange={e => setUserToApprove(e.target.value)} />
              <button className="btn-admin" onClick={approveUser}>Approve User</button>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h3>Active Campaigns</h3>
            <button onClick={loadCampaigns} style={{ background: 'transparent', border: '1px solid #475569', color: '#e2e8f0' }}>
              🔄 Refresh
            </button>
          </div>

          {campaigns.length === 0 ? <p className="text-gray" style={{ textAlign: 'center', marginTop: '40px' }}>No campaigns found on the blockchain.</p> : null}
          
          <div className="campaign-grid">
            {campaigns.map(c => {
              const isGoalReached = Number(c.raised) >= Number(c.goal);
              const progressPercent = Math.min((Number(c.raised) / Number(c.goal)) * 100, 100);
              
              // Determine if current user is the creator and check the status
              const isCreator = account.toLowerCase() === c.creator;
              const isCompleted = c.status === 1; // 1 = Completed
              const isWithdrawn = c.status === 2; // 2 = Withdrawn
              
              return (
                <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ color: 'white', fontSize: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
                      {c.title}
                      {isWithdrawn && <span style={{fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'normal'}}>Withdrawn</span>}
                    </h4>
                    
                    <div className="progress-bg">
                      <div className="progress-fill" style={{ width: `${progressPercent}%`, filter: isWithdrawn ? 'grayscale(100%)' : 'none' }}></div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <span className="text-gray">Raised: <strong style={{color: '#f8fafc'}}>{c.raised} ETH</strong></span>
                      <span className="text-gray">Goal: <strong style={{color: '#f8fafc'}}>{c.goal} ETH</strong></span>
                    </div>
                  </div>
                  
                  <div className="flex-row" style={{ flexWrap: 'wrap' }}>
                    {/* Only show Contribute button if funds haven't been withdrawn yet */}
                    {!isWithdrawn && (
                      <button 
                        className="btn-primary" 
                        onClick={() => contributeToCamp(c.id, c.goal, c.raised)} 
                        disabled={isGoalReached}
                        style={{ flex: 1, background: isGoalReached ? '#334155' : '', color: isGoalReached ? '#94a3b8' : '' }}
                      >
                        {isGoalReached ? 'Goal Reached 🎉' : 'Contribute'}
                      </button>
                    )}

                    {/* NEW: Withdraw Button (Only shows for the creator when goal is met) */}
                    {isCreator && isCompleted && (
                       <button className="btn-withdraw" onClick={() => withdrawFunds(c.id)} style={{ flex: 1 }}>
                         💰 Withdraw
                       </button>
                    )}

                    {/* NEW: Withdrawn Badge (Shows when status == 2) */}
                    {isWithdrawn && (
                       <button disabled style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', color: '#475569' }}>
                         💸 Funds Withdrawn
                       </button>
                    )}

                    {adminAddress === account.toLowerCase() && (
                      <button className="btn-danger" onClick={() => deleteCamp(c.id)} title="Delete Campaign">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;