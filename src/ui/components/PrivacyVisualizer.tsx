import React, { useState } from 'react';

// Inline privacy model constants (browser-safe — no dotenv dependency)
const OBSERVER_CAN_LEARN = [
  'A valid membership proof was submitted',
  'Public verification result (accepted/rejected)',
  'Aggregate statistics (total verifications/rejections)',
  'Current Merkle root (opaque hash)',
  'Whether a proof nullifier was used',
];

const OBSERVER_CANNOT_LEARN = [
  "Which address submitted the proof",
  "Whether a specific address is on the allowlist",
  "The full list of allowlist members",
  "The size of the allowlist",
  "The member's position in the Merkle tree",
];

const PrivacyVisualizer: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'model' | 'flow' | 'tech'>('model');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Section tabs */}
      <div className="tabs" style={{ marginBottom: '32px', maxWidth: '460px' }}>
        {[
          { id: 'model' as const, label: '🛡 Privacy Model' },
          { id: 'flow'  as const, label: '🔄 Proof Flow' },
          { id: 'tech'  as const, label: '⚙️ Technical' },
        ].map((t) => (
          <button
            key={t.id}
            id={`privacy-tab-${t.id}`}
            className={`tab ${activeSection === t.id ? 'active' : ''}`}
            onClick={() => setActiveSection(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Privacy Model ─────────────────────────────────────────────── */}
      {activeSection === 'model' && (
        <div className="animate-fadeIn">
          <div className="grid-2">
            {/* What observer CAN learn */}
            <div className="card">
              <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                }}>👁</div>
                <h3 style={{ color: '#34d399' }}>Observer CAN Learn</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {OBSERVER_CAN_LEARN.map((item, i) => (
                  <div key={i} className="feature-item" style={{ padding: '8px 0' }}>
                    <div className="status-dot green" style={{ marginTop: '4px', flexShrink: 0 }}></div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* What observer CANNOT learn */}
            <div className="card">
              <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                }}>🔒</div>
                <h3 style={{ color: '#fb7185' }}>Observer CANNOT Learn</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {OBSERVER_CANNOT_LEARN.map((item, i) => (
                  <div key={i} className="feature-item" style={{ padding: '8px 0' }}>
                    <div className="status-dot red" style={{ marginTop: '4px', flexShrink: 0 }}></div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>🌙 Midnight's Privacy Primitives Used</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {[
                { icon: '🌲', title: 'Merkle Trees', desc: 'Root public; list private. Membership without enumeration.' },
                { icon: '🎲', title: 'Random Nonces', desc: 'Each proof has a fresh nonce — two proofs are unlinkable.' },
                { icon: '🔑', title: 'Nullifiers', desc: 'Deterministic per-user hash prevents replay attacks.' },
                { icon: '🔒', title: 'Commitments', desc: 'hash(leafHash || nonce) — binds proof without revealing identity.' },
                { icon: '⚡', title: 'ZK Circuits', desc: 'Compact circuits verify membership without disclosing witnesses.' },
                { icon: '🛡', title: 'Witnesses', desc: 'Private inputs never leave the user\'s device — ZK proof only.' },
              ].map((item) => (
                <div key={item.title} style={{
                  background: 'rgba(124,58,237,0.06)',
                  border: '1px solid var(--color-border-accent)',
                  borderRadius: '12px',
                  padding: '16px',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Proof Flow ────────────────────────────────────────────────── */}
      {activeSection === 'flow' && (
        <div className="animate-fadeIn card">
          <h3 style={{ marginBottom: '24px' }}>🔄 Zero-Knowledge Proof Flow</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              {
                step: '1',
                title: 'Admin builds Merkle tree',
                detail: 'Addresses are hashed: hash(address || salt). Only the root is published on-chain.',
                color: '#7c3aed',
                icon: '🌲',
              },
              {
                step: '2',
                title: 'User requests proof generation',
                detail: 'User provides address locally. The service checks membership and builds a Merkle path.',
                color: '#4f46e5',
                icon: '👤',
              },
              {
                step: '3',
                title: 'Proof data assembled (all private)',
                detail: 'commitment = hash(leafHash || nonce)\nnullifier = hash(leafHash || secret)\nMerkle path = sibling hashes only',
                color: '#06b6d4',
                icon: '⚡',
              },
              {
                step: '4',
                title: 'ProofData sent for verification',
                detail: 'ProofData contains NO plaintext address. The commitment and nullifier are opaque hashes.',
                color: '#10b981',
                icon: '📤',
              },
              {
                step: '5',
                title: 'Contract/service verifies',
                detail: 'Checks: commitment valid, nullifier unused, root matches, Merkle path reconstructs root.',
                color: '#f59e0b',
                icon: '✅',
              },
              {
                step: '6',
                title: 'Result: accept or reject (public)',
                detail: 'Only the binary result is revealed. Nullifier is recorded for replay prevention.',
                color: '#f43f5e',
                icon: '🎯',
              },
            ].map((s, i) => (
              <div key={s.step} style={{ display: 'flex', gap: '20px', paddingBottom: '24px', position: 'relative' }}>
                {i < 5 && (
                  <div style={{
                    position: 'absolute', left: '20px', top: '48px',
                    width: '2px', height: '100%',
                    background: 'linear-gradient(to bottom, rgba(124,58,237,0.3), transparent)',
                  }}></div>
                )}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: s.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0, position: 'relative', zIndex: 1,
                  boxShadow: `0 0 16px ${s.color}40`,
                }}>{s.icon}</div>
                <div style={{ paddingTop: '8px' }}>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    Step {s.step}: {s.title}
                  </div>
                  <pre style={{
                    fontSize: '0.82rem', color: 'var(--color-text-muted)',
                    fontFamily: s.detail.includes('=') ? 'var(--font-mono)' : 'var(--font-sans)',
                    whiteSpace: 'pre-wrap', lineHeight: 1.6,
                  }}>{s.detail}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Technical ─────────────────────────────────────────────────── */}
      {activeSection === 'tech' && (
        <div className="animate-fadeIn">
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>⚙️ Technical Implementation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                {
                  label: 'Smart Contract',
                  value: 'PrivateAllowlist.compact (Compact language ≥ 0.21.0)',
                  badge: 'Midnight',
                },
                { label: 'Hash Function', value: 'SHA-256 (via crypto-js)', badge: 'Crypto' },
                { label: 'Merkle Tree', value: 'merkletreejs with sorted pairs (position-hiding)', badge: 'Privacy' },
                { label: 'Commitment', value: 'SHA-256(leafHash || nonce || domain_separator)', badge: 'ZK' },
                { label: 'Nullifier', value: 'SHA-256(leafHash || domain_separator || secret)', badge: 'Replay Prevention' },
                { label: 'Tree Depth', value: '10 levels (supports 1024 members, hides exact count)', badge: 'Privacy' },
                { label: 'Proof Expiry', value: '300 seconds (configurable via PROOF_EXPIRY_SECONDS)', badge: 'Security' },
                { label: 'Frontend', value: 'React 18 + Vite 5 + TypeScript', badge: 'UI' },
                { label: 'API', value: 'Express.js + TypeScript', badge: 'Backend' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between" style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>{item.label}</div>
                    <code style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{item.value}</code>
                  </div>
                  <span className="badge badge-purple">{item.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyVisualizer;
