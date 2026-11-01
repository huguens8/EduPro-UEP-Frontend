import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PasswordInput from '../components/PasswordInput';
import uepLogo from '../assets/Logo UEP.jpeg';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const location = useLocation();
  const [error, setError] = useState(
    new URLSearchParams(location.search).get('expired')
      ? 'Votre session a expiré. Veuillez vous reconnecter.'
      : '',
  );
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      // Toujours le tableau de bord après connexion, jamais la page consultée
      // avant (sinon un autre compte atterrit sur le FIOP du compte précédent) ;
      // sauf première connexion : il faut d'abord remplacer le mot de passe temporaire.
      navigate(data.mustChangePassword ? '/changer-mot-de-passe' : '/tableau-de-bord', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message
        || 'Impossible de se connecter. Vérifiez vos identifiants.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-hero" aria-hidden="true">
        <div className="login-gantt">
          <span className="gantt-today" />
          <span className="gantt-bar bar-1" />
          <span className="gantt-bar bar-2" />
          <span className="gantt-bar bar-3" />
          <span className="gantt-bar bar-4" />
          <span className="gantt-bar bar-5" />
          <span className="gantt-bar bar-6" />
        </div>
        <h2>Planifier, valider et suivre les projets de l'éducation.</h2>
        <p>FIOP, PIP, Documents, partenaires et tableaux de bord réunis dans un seul espace.</p>
      </section>

      <form className="login-card" onSubmit={handleSubmit}>
        <img src={uepLogo} alt="UEP" className="login-logo" />
        <h1>EduPro-UEP</h1>
        <p className="login-subtitle">
          Unité d’Études et de Programmation (UEP) du MENFP
        </p>

        {error && <div className="login-error">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Mot de passe</label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>

        <p className="login-hint">
          Vous n'avez pas de compte ? Seul un administrateur peut en créer un pour vous.
        </p>
      </form>
    </div>
  );
}
