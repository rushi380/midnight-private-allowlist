import React, { useState } from 'react';
import type { ProofData, VerificationResult } from '../../contracts/types/index';

interface VerificationResultProps {
  proof: ProofData | null;
  result: VerificationResult | null;
  onVerified: (result: VerificationResult) => void;
}

const VerificationResultComponent: React.FC<VerificationResultProps> = ({
  proof,
  result,
  onVerified,
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [pastedProof, setPastedProof] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (proofToVerify: ProofData) => {
    setIsVerifying(true);
    setError('');

    // Simulate verification (local or API)
    await new Promise((r) => setTimeout(r, 600));

    try {
      const res = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proof: proofToVerify }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          onVerified(data.result);
          setIsVerifying(false);
          return;
        }
      }
    } catch {
      // API not available — do local simulation
    }

    // Local simulation
    const isValid =
      proofToVerify.commitment?.length === 64 &&
      proofToVerify.nullifier?.length === 64 &&
      proofToVerify.merklePath?.length > 0 &&
      Date.now() - proofToVerify.timestamp < 300_000;

    const simulatedResult: VerificationResult = {
      isValid,
      message: isValid
        ? 'Membership verified — access granted (simulated)'
        : 'Verification failed — proof invalid or expired',
      verifiedAt: Date.now(),
      nullifier: proofToVerify.nullifier,
      errorCode: isValid ? undefined : 'PROOF_EXPIRED',
    };

    onVerified(simulatedResult);
    setIsVerifying(false);
  };

  const handlePastedVerify = () => {
    try {
      const parsed = JSON.parse(pastedProof) as ProofData;
      if (!parsed.commitment || !parsed.nullifier) throw new Error('Invalid proof format');
      handleVerify(parsed);
    } catch {
      setError('Invalid proof JSON. Please paste a valid proof object.');
    }
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>

      {/* ── Loaded proof ─────────────────────────────────────────────── */}
      {proof && !result && (
        <div className="card card-gradient animate-fadeIn" style={{ marginBottom: '24px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '20px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem',
            }}>✅</div>
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '4px' }}>Verify Membership Proof</h2>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                Proof loaded from generator — ready to verify
              </p>
            </div>
          </div>

          {/* Proof summary */}
          <div className="code-block" style={{ marginBottom: '20px' }}>
            {`Commitment: ${proof.commitment.slice(0, 32)}...\nNullifier:  ${proof.nullifier.slice(0, 32)}...\nTimestamp:  ${new Date(proof.timestamp).toLocaleTimeString()}\nRoot:       ${proof.merkleRoot.slice(0, 32)}...\nDepth:      ${proof.treeDepth} levels`}
          </div>

          <button
            id="verify-proof-btn"
            className="btn btn-primary btn-lg"
            onClick={() => handleVerify(proof)}
            disabled={isVerifying}
            style={{ width: '100%' }}
          >
            {isVerifying ? (
              <><div className="spinner" style={{ borderTopColor: '#fff' }}></div> Verifying on Chain...</>
            ) : (
              '🔍 Verify Against Contract'
            )}
          </button>
        </div>
      )}

      {/* ── Result display ────────────────────────────────────────────── */}
      {result && (
        <div className={`card animate-fadeIn`} style={{
          marginBottom: '24px',
          border: `1px solid ${result.isValid ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.4)'}`,
          background: result.isValid
            ? 'rgba(16,185,129,0.06)'
            : 'rgba(244,63,94,0.06)',
        }}>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              fontSize: '4rem', marginBottom: '16px',
              animation: 'fadeIn 0.5s ease',
            }}>
              {result.isValid ? '🎉' : '🚫'}
            </div>
            <h2 style={{
              fontSize: '1.75rem',
              color: result.isValid ? '#34d399' : '#fb7185',
              marginBottom: '12px',
            }}>
              {result.isValid ? 'Access Granted' : 'Access Denied'}
            </h2>
            <p style={{ marginBottom: '24px' }}>{result.message}</p>

            <div style={{
              display: 'inline-flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
              <span className={`badge ${result.isValid ? 'badge-green' : 'badge-red'}`}>
                {result.isValid ? '✓ Valid Proof' : '✗ Invalid Proof'}
              </span>
              {result.errorCode && (
                <span className="badge badge-red">
                  Error: {result.errorCode}
                </span>
              )}
              <span className="badge badge-blue">
                🕐 {new Date(result.verifiedAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {result.nullifier && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                Nullifier recorded (replay prevention):
              </div>
              <code className="code-block" style={{ padding: '10px 14px', display: 'block', fontSize: '0.75rem' }}>
                {result.nullifier.slice(0, 32)}...
              </code>
            </div>
          )}

          {/* Privacy note */}
          <div className="alert alert-info" style={{ marginTop: '20px', fontSize: '0.85rem' }}>
            🔒 <strong>Privacy preserved:</strong> The verifier learned only that a valid proof
            was submitted — not who submitted it or whether any specific address is on the list.
          </div>

          <button
            id="verify-again-btn"
            className="btn btn-secondary"
            onClick={() => {}}
            style={{ width: '100%', marginTop: '16px' }}
          >
            ↺ Verify Another Proof
          </button>
        </div>
      )}

      {/* ── Manual paste ─────────────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>📋 Paste Proof Manually</h3>
        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label className="input-label" htmlFor="paste-proof">Proof JSON</label>
          <textarea
            id="paste-proof"
            className="input"
            placeholder='{"commitment": "...", "nullifier": "...", ...}'
            value={pastedProof}
            onChange={(e) => { setPastedProof(e.target.value); setError(''); }}
            style={{ minHeight: '120px' }}
          />
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <button
          id="verify-pasted-btn"
          className="btn btn-secondary"
          onClick={handlePastedVerify}
          disabled={!pastedProof.trim() || isVerifying}
          style={{ width: '100%' }}
        >
          {isVerifying ? 'Verifying...' : '🔍 Verify Pasted Proof'}
        </button>
      </div>

      {/* No proof yet */}
      {!proof && !result && (
        <div className="alert alert-warning" style={{ marginTop: '24px' }}>
          ⚡ No proof loaded. Go to the <strong>Generate Proof</strong> tab first, or paste a proof JSON above.
        </div>
      )}
    </div>
  );
};

export default VerificationResultComponent;
