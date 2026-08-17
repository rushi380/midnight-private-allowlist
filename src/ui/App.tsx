import React, { useState, useEffect } from 'react';
import ProofGenerator from './ProofGenerator';
import VerificationResult from './VerificationResult';
import AllowlistManager from './components/AllowlistManager';
import PrivacyVisualizer from './components/PrivacyVisualizer';
import { PrivateMerkleTree } from '../services/merkleTree';
import type { ProofData, VerificationResult as VResult } from '../contracts/types/index';

type Tab = 'generate' | 'verify' | 'admin' | 'privacy';

const RAW_CONTRACT = import.meta.env['VITE_CONTRACT_ADDRESS'] ?? '';
const CONTRACT_ADDRESS = RAW_CONTRACT || null; // null = not deployed
const NETWORK = import.meta.env['VITE_NETWORK'] ?? 'testnet';

// Demo allowlist — same addresses used by the API and ProofGenerator
const DEMO_ALLOWLIST = [
  '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
  '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
  '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
  '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
  '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65',
];

/** Compute the Merkle root client-side so it never gets stuck loading. */
function computeLocalRoot(): string {
  try {
    const tree = new PrivateMerkleTree({ salt: 'dev-secret-change-in-production' });
    tree.buildTree(DEMO_ALLOWLIST);
    return tree.getRoot();
  } catch {
    return '';
  }
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const [generatedProof, setGeneratedProof] = useState<ProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<VResult | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string>(computeLocalRoot);
  const [statsCount, setStatsCount] = useState({ verifications: 0, rejections: 0 });

  useEffect(() => {
    fetchPublicRoot();
  }, []);

  const fetchPublicRoot = async () => {
    try {
      const res = await fetch('/api/public-root');
      if (!res.ok) return;
      const data = await res.json();
      // Prefer live API root; fall back to local if absent
      if (data.merkleRoot) setMerkleRoot(data.merkleRoot);
    } catch {
      // API not available — local root already shown
    }
  };

  const handleProofGenerated = (proof: ProofData) => {
    setGeneratedProof(proof);
    setVerificationResult(null);
  };

  const handleSendToVerify = () => {
    setActiveTab('verify');
  };

  const handleVerificationComplete = (result: VResult) => {
    setVerificationResult(result);
    setStatsCount((prev) => ({
      verifications: result.isValid ? prev.verifications + 1 : prev.verifications,
      rejections: !result.isValid ? prev.rejections + 1 : prev.rejections,
    }));
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-brand">
            <span style={{ fontSize: '1.5rem' }}>🌙</span>
            <span>
              Midnight <span className="gradient-text">Private Allowlist</span>
            </span>
          </div>
          <div className="navbar-links flex items-center gap-6">
            <div className="privacy-shield">
              <span>🛡</span>
              <span>ZK Protected</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {NETWORK}
            </span>
            <div className="flex items-center gap-2">
              <div className="status-dot green pulse"></div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Live</span>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section style={{
        background: 'var(--gradient-hero)',
        padding: '64px 24px 48px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow orbs */}
        <div style={{
          position: 'absolute', top: '-50px', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '300px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}></div>

        <div className="container" style={{ position: 'relative' }}>
          <div className="badge badge-purple" style={{ marginBottom: '24px', display: 'inline-flex' }}>
            🌙 Midnight Blockchain · Privacy-First dApp
          </div>

          <h1 style={{ marginBottom: '16px' }}>
            Private Access <span className="gradient-text">Without</span>
            <br />Revealing Identity
          </h1>

          <p style={{ maxWidth: '620px', margin: '0 auto 32px', fontSize: '1.1rem', lineHeight: 1.7 }}>
            Prove you're on the allowlist using zero-knowledge proofs.
            No one learns <em>who</em> you are — only that you're authorized.
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            {[
              { label: 'Verifications', value: statsCount.verifications },
              { label: 'Rejections', value: statsCount.rejections },
              { label: 'Privacy Level', value: '100%' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-accent)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contract Info Strip ─────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(124,58,237,0.08)',
        borderTop: '1px solid rgba(124,58,237,0.15)',
        borderBottom: '1px solid rgba(124,58,237,0.15)',
        padding: '12px 24px',
      }}>
        <div className="container flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>CONTRACT:</span>
          {CONTRACT_ADDRESS ? (
            <code style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: 'var(--color-text-accent)',
            }}>
              {CONTRACT_ADDRESS}
            </code>
          ) : (
            <span style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(251,191,36,0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '6px',
              padding: '2px 10px',
            }}>
              ⚠ Not Deployed · Demo Mode
            </span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            MERKLE ROOT: <code style={{ color: '#67e8f9', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {merkleRoot ? `${merkleRoot.slice(0, 20)}...` : '—'}
            </code>
          </span>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <main className="container section">
        {/* Tab navigation */}
        <div className="tabs" style={{ marginBottom: '40px' }}>
          {([
            { id: 'generate', label: '⚡ Generate Proof', },
            { id: 'verify',   label: '✅ Verify Proof', },
            { id: 'admin',    label: '🔧 Allowlist', },
            { id: 'privacy',  label: '🛡 Privacy Model', },
          ] as { id: Tab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.id === 'verify' && generatedProof && (
                <span style={{
                  marginLeft: '6px',
                  background: 'rgba(124,58,237,0.8)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}>1</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        {activeTab === 'generate' && (
          <div className="animate-fadeIn">
            <ProofGenerator
              onProofGenerated={handleProofGenerated}
              onSendToVerify={handleSendToVerify}
            />
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="animate-fadeIn">
            <VerificationResult
              proof={generatedProof}
              onVerified={handleVerificationComplete}
              result={verificationResult}
            />
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="animate-fadeIn">
            <AllowlistManager />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="animate-fadeIn">
            <PrivacyVisualizer />
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--color-border)',
        padding: '32px 24px',
        textAlign: 'center',
      }}>
        <div className="container">
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            🌙 Midnight Private Allowlist · Built on{' '}
            <a href="https://midnight.network" target="_blank" rel="noopener noreferrer">
              Midnight Network
            </a>
            {' '}· Privacy-preserving ZK proofs · Open Source
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
