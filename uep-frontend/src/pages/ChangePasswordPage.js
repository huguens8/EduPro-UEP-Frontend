import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PasswordInput from '../components/PasswordInput';
import uepLogo from '../assets/Logo UEP.jpeg';
import './LoginPage.css';

/**
 * Première connexion : l'utilisateur remplace le mot de passe temporaire reçu par
 * e-mail. Tant que ce n'est pas fait, c'est la seule page accessible.
 */
export default function ChangePasswordPage() {
  const { auth, loading, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return null;
  }
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/tableau-de-bord', { replace: true });
    } catch (err) {
      const data = err.response?.data;
      setError(data?.message || data?.newPassword || 'Le changement de mot de passe a échoué.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={uepLogo} alt="UEP" className="login-logo" />
        <h1>Nouveau mot de passe</h1>
        <p className="login-subtitle">
          {auth.mustChangePassword
            ? 'Bienvenue ! Remplacez le mot de passe temporaire reçu par e-mail pour accéder à EduPro-UEP.'
            : 'Choisissez un nouveau mot de passe.'}
        </p>

        {error && <div className="login-error">{error}</div>}

        <label htmlFor="current-password">Mot de passe actuel (temporaire)</label>
        <PasswordInput
          id="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        <label htmlFor="new-password">Nouveau mot de passe (8 caractères minimum)</label>
        <PasswordInput
          id="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm-password">Confirmer le nouveau mot de passe</label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
        />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Enregistrement...' : 'Enregistrer et continuer'}
        </button>

        <p className="login-hint">
          <button type="button" className="login-link-btn" onClick={logout}>Se déconnecter</button>
        </p>
      </form>
    </div>
  );
}
