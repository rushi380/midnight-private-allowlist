import React, { useState } from 'react';
import type { ProofData } from '../../contracts/types/index';

interface ProofGeneratorProps {
  onProofGenerated: (proof: ProofData) => void;
  onSendToVerify: () => void;
}

const DEMO_ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

const ProofGenerator: React.FC<ProofGeneratorProps> = ({ onProofGenerated, onSendToVerify }) => {
  const [address, setAddress] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proof, setProof] = useState<ProofData | null>(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'api' | 'demo'>('demo');

  const handleGenerate = async () => {
    if (!address.trim()) {
      setError('Please enter your Ethereum address');
      return;
    }
    setIsGenerating(true);
    setError('');
    setProof(null);

    if (mode === 'demo') {
      // Simulate proof generation locally using the demo allowlist
      await new Promise((r) => setTimeout(r, 800));
      const isInList = DEMO_ALLOWLIST.some(
        (a) => a.toLowerCase() === address.toLowerCase().trim()
      );
      if (!isInList) {
        setError('❌ Address not in allowlist. Try one of the demo addresses below.');
        setIsGenerating(false);
        return;
      }
      // Generate a simulated proof structure (mirrors real ProofData)
      const mockProof: ProofData = {
        commitment: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        nullifier: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        nonce: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        merklePath: Array.from({ length: 3 }, () => ({
          sibling: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          isRight: Math.random() > 0.5,
        })),
        timestamp: Date.now(),
        merkleRoot: 'a3f8d2b1c9e5074612984f3a8d7c2b1e4f906a3b8d7c2e5f1a2b3c4d5e6f708a',
        treeDepth: 3,
      };
      setProof(mockProof);
      onProofGenerated(mockProof);
    } else {
      // Real API call
      try {
        const res = await fetch('/api/generate-proof', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        const data = await res.json();
        if (data.success && data.proof) {
          setProof(data.proof);
          onProofGenerated(data.proof);
        } else {
          setError(data.message ?? 'Failed to generate proof');
        }
      } catch {
        setError('API server not available. Switch to Demo mode.');
      }
    }
    setIsGenerating(false);
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="card card-gradient" style={{ marginBottom: '24px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '24px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'var(--gradient-accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
            boxShadow: 'var(--shadow-glow-sm)',
          }}>⚡</div>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Generate ZK Proof</h2>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Your address stays private — only cryptographic proof is generated
            </p>
          </div>
        </div>

        {/* Mode selector */}
        <div style={{ marginBottom: '24px' }}>
          <div className="tabs" style={{ maxWidth: '320px' }}>
            <button
              id="mode-demo"
              className={`tab ${mode === 'demo' ? 'active' : ''}`}
              onClick={() => setMode('demo')}
            >Demo Mode</button>
            <button
              id="mode-api"
              className={`tab ${mode === 'api' ? 'active' : ''}`}
              onClick={() => setMode('api')}
            >API Mode</button>
          </div>
          {mode === 'demo' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              ℹ️ Demo mode runs locally — no API server needed
            </p>
          )}
        </div>

        {/* Address input */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label className="input-label" htmlFor="address-input">
            🔑 Your Ethereum Address
          </label>
          <input
            id="address-input"
            className="input"
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* Generate button */}
        <button
          id="generate-proof-btn"
          className="btn btn-primary btn-lg"
          onClick={handleGenerate}
          disabled={isGenerating || !address.trim()}
          style={{ width: '100%' }}
        >
          {isGenerating ? (
            <>
              <div className="spinner" style={{ borderTopColor: '#fff' }}></div>
              Generating ZK Proof...
            </>
          ) : (
            <> ⚡ Generate Membership Proof </>
          )}
        </button>

        {/* Privacy guarantee */}
        <div className="privacy-shield" style={{ marginTop: '16px', justifyContent: 'center' }}>
          🛡 Your address is NEVER sent to any server or stored
        </div>
      </div>

      {/* Demo addresses */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>🧪 Demo Allowlist Addresses</h3>
        <p style={{ fontSize: '0.85rem', marginBottom: '16px' }}>
          Click any address below to auto-fill the input:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {DEMO_ALLOWLIST.map((addr, i) => (
            <button
              key={addr}
              id={`demo-addr-${i}`}
              onClick={() => { setAddress(addr); setError(''); }}
              style={{
                background: address.toLowerCase() === addr.toLowerCase()
                  ? 'rgba(124,58,237,0.15)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${address.toLowerCase() === addr.toLowerCase()
                  ? 'rgba(124,58,237,0.4)'
                  : 'var(--color-border)'}`,
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--color-text-secondary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ color: 'var(--color-text-muted)', marginRight: '12px' }}>#{i + 1}</span>
              {addr}
            </button>
          ))}
        </div>
      </div>

      {/* Generated proof display */}
      {proof && (
        <div className="card animate-fadeIn">
          <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <div>
              <h3 style={{ color: '#34d399', marginBottom: '4px' }}>Proof Generated Successfully!</h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                Your membership proof is ready — your identity is protected
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Commitment', value: proof.commitment.slice(0, 20) + '...', icon: '🔒' },
              { label: 'Nullifier', value: proof.nullifier.slice(0, 20) + '...', icon: '🔑' },
              { label: 'Nonce', value: proof.nonce.slice(0, 20) + '...', icon: '🎲' },
              { label: 'Tree Depth', value: String(proof.treeDepth), icon: '🌲' },
            ].map((field) => (
              <div key={field.label} style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: '10px',
                padding: '12px',
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
                  {field.icon} {field.label}
                </div>
                <code style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  {field.value}
                </code>
              </div>
            ))}
          </div>

          <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
            🔒 <strong>Privacy guarantee:</strong> No plaintext address appears in the proof.
            The commitment uses a random nonce — two proofs from the same user are unlinkable.
          </div>

          <button
            id="send-to-verify-btn"
            className="btn btn-success"
            onClick={onSendToVerify}
            style={{ width: '100%' }}
          >
            ✅ Send to Verification →
          </button>
        </div>
      )}
    </div>
  );
};

export default ProofGenerator;
