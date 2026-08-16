import React, { useState } from 'react';

const DEFAULT_ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const AllowlistManager: React.FC = () => {
  const [addresses, setAddresses] = useState<string[]>(DEFAULT_ALLOWLIST);
  const [newAddress, setNewAddress] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addAddress = () => {
    if (!newAddress.trim()) return;
    if (!/^0x[0-9a-fA-F]{40}$/.test(newAddress.trim())) {
      setStatus({ type: 'error', message: 'Invalid Ethereum address format' });
      return;
    }
    if (addresses.includes(newAddress.toLowerCase())) {
      setStatus({ type: 'error', message: 'Address already in allowlist' });
      return;
    }
    setAddresses((prev) => [...prev, newAddress.toLowerCase()]);
    setNewAddress('');
    setStatus({ type: 'success', message: 'Address added (not yet saved to contract)' });
  };

  const removeAddress = (addr: string) => {
    setAddresses((prev) => prev.filter((a) => a !== addr));
  };

  const handleUpdateContract = async () => {
    if (!adminSecret) {
      setStatus({ type: 'error', message: 'Admin secret required' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/set-allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses, adminSecret }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          type: 'success',
          message: `✅ Allowlist updated! New root: ${data.newRoot?.slice(0, 20)}...`,
        });
      } else {
        setStatus({ type: 'error', message: data.message ?? 'Update failed' });
      }
    } catch {
      setStatus({
        type: 'info',
        message: 'API not connected — allowlist updated locally (restart server to apply)',
      });
    }
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ marginBottom: '8px' }}>🔧 Allowlist Manager</h2>
        <p style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
          Manage the private allowlist. Only the Merkle <em>root</em> is published on-chain —
          the actual addresses stay private.
        </p>

        {/* Member list */}
        <div style={{ marginBottom: '24px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem' }}>
              Current Members <span className="badge badge-purple" style={{ marginLeft: '8px' }}>
                {addresses.length}
              </span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {addresses.map((addr, i) => (
              <div key={addr} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px', padding: '10px 14px',
              }}>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', minWidth: '24px' }}>
                    #{i + 1}
                  </span>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                    {addr}
                  </code>
                </div>
                <button
                  id={`remove-addr-${i}`}
                  onClick={() => removeAddress(addr)}
                  style={{
                    background: 'rgba(244,63,94,0.1)',
                    border: '1px solid rgba(244,63,94,0.2)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    color: '#fb7185',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >Remove</button>
              </div>
            ))}
          </div>
        </div>

        {/* Add address */}
        <div className="flex gap-3" style={{ marginBottom: '24px' }}>
          <input
            id="new-address-input"
            className="input"
            type="text"
            placeholder="0x..."
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addAddress()}
            style={{ flex: 1 }}
          />
          <button
            id="add-address-btn"
            className="btn btn-secondary"
            onClick={addAddress}
          >+ Add</button>
        </div>

        <div className="divider" />

        {/* Admin section */}
        <h3 style={{ marginBottom: '12px', fontSize: '1rem' }}>🔑 Update Contract (Admin)</h3>
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label" htmlFor="admin-secret-input">Admin Secret</label>
          <input
            id="admin-secret-input"
            className="input"
            type="password"
            placeholder="Enter admin secret..."
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
          />
        </div>

        {status && (
          <div className={`alert alert-${status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : 'info'}`}
            style={{ marginBottom: '16px' }}>
            {status.message}
          </div>
        )}

        <button
          id="update-contract-btn"
          className="btn btn-primary"
          onClick={handleUpdateContract}
          disabled={isLoading || !adminSecret}
          style={{ width: '100%' }}
        >
          {isLoading ? (
            <><div className="spinner" style={{ borderTopColor: '#fff' }}></div> Updating...</>
          ) : (
            '🚀 Update Merkle Root on Contract'
          )}
        </button>

        <div className="alert alert-info" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
          🔒 Only the Merkle root hash is submitted to the contract — never the list of addresses.
          The actual allowlist can remain completely private.
        </div>
      </div>
    </div>
  );
};

export default AllowlistManager;
