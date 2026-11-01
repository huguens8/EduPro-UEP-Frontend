import React, { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../auth/AuthContext';
import Modal from '../components/Modal';
import './AdminUsersPage.css';

const ROLES = [
  { value: 'ADMINISTRATEUR', label: 'Administrateur' },
  { value: 'Porteur_PROJET', label: 'Porteur de Projet' },
  { value: 'SUPERVISEUR_UEP', label: 'Superviseur UEP' },
  { value: 'VISITEUR', label: 'Visiteur' },
];

const EMPTY_FORM = { username: '', email: '', role: 'Porteur_PROJET' };

function initials(username) {
  const parts = username.trim().split(/[\s_.]+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function roleClass(role) {
  return `role-${role.toLowerCase()}`;
}

export default function AdminUsersPage() {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [listError, setListError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [menuOpenId, setMenuOpenId] = useState(null);

  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', role: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Réinitialisation du mot de passe : un mot de passe temporaire est envoyé au titulaire.
  const [resetUser, setResetUser] = useState(null);
  const [resetError, setResetError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setListError('');
    try {
      const { data } = await apiClient.get('/users');
      setUsers(data);
    } catch (err) {
      setListError('Impossible de charger la liste des comptes.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!event.target.closest('.row-menu-cell')) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormErrors({});
    setSuccessMessage('');
    setSubmitting(true);
    try {
      await apiClient.post('/users', form);
      setSuccessMessage(`Compte "${form.username}" créé. Ses identifiants ont été envoyés à ${form.email}.`);
      setForm(EMPTY_FORM);
      loadUsers();
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.message) {
        setFormErrors(data);
      } else {
        setFormErrors({ general: data?.message || 'La création du compte a échoué.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMenu = (userId) => {
    setMenuOpenId((prev) => (prev === userId ? null : userId));
  };

  const handleToggleActive = async (user) => {
    setMenuOpenId(null);
    try {
      const { data } = await apiClient.patch(`/users/${user.id}/active`, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data : u)));
    } catch (err) {
      window.alert(err.response?.data?.message || 'Le changement de statut a échoué.');
    }
  };

  const openEdit = (user) => {
    setMenuOpenId(null);
    setEditUser(user);
    setEditForm({ username: user.username, email: user.email, role: user.role });
    setEditErrors({});
  };

  const closeEdit = () => setEditUser(null);

  const submitEdit = async (event) => {
    event.preventDefault();
    setEditErrors({});
    setEditSubmitting(true);
    try {
      let latest = editUser;
      if (editForm.username !== editUser.username || editForm.email !== editUser.email) {
        const { data } = await apiClient.put(`/users/${editUser.id}`, {
          username: editForm.username,
          email: editForm.email,
        });
        latest = data;
      }
      if (editForm.role !== editUser.role) {
        const { data } = await apiClient.patch(`/users/${editUser.id}/role`, { role: editForm.role });
        latest = data;
      }
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? latest : u)));
      setEditUser(null);
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.message) {
        setEditErrors(data);
      } else {
        setEditErrors({ general: data?.message || 'La modification a échoué.' });
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const openDelete = (user) => {
    setMenuOpenId(null);
    setDeleteUser(user);
    setDeleteError('');
  };

  const closeDelete = () => setDeleteUser(null);

  const confirmDelete = async () => {
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      await apiClient.delete(`/users/${deleteUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'La suppression a échoué.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const deactivateInsteadOfDelete = async () => {
    setDeleteError('');
    setDeleteSubmitting(true);
    try {
      const { data } = await apiClient.patch(`/users/${deleteUser.id}/active`, { active: false });
      setUsers((prev) => prev.map((u) => (u.id === deleteUser.id ? data : u)));
      setDeleteUser(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'La désactivation a échoué.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const openReset = (user) => {
    setMenuOpenId(null);
    setResetUser(user);
    setResetError('');
    setResetMessage('');
  };

  const closeReset = () => setResetUser(null);

  const confirmReset = async () => {
    setResetError('');
    setResetSubmitting(true);
    try {
      await apiClient.post(`/users/${resetUser.id}/reset-password`);
      setResetMessage(
        `Mot de passe de ${resetUser.username} réinitialisé : un mot de passe temporaire a été envoyé à ${resetUser.email}.`,
      );
      setResetUser(null);
    } catch (err) {
      setResetError(err.response?.data?.message || 'La réinitialisation a échoué.');
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-content">
        <section className="admin-card create-card">
          <h2>Créer un compte</h2>
          <form onSubmit={handleSubmit} className="create-user-form">
            <div className="field">
              <label htmlFor="new-username">Nom complet d’utilisateur </label>
              <input
                id="new-username"
                type="text"
                value={form.username}
                onChange={handleChange('username')}
                required
              />
              {formErrors.username && <span className="field-error">{formErrors.username}</span>}
            </div>

            <div className="field">
              <label htmlFor="new-email">Email</label>
              <input
                id="new-email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                required
              />
              {formErrors.email && <span className="field-error">{formErrors.email}</span>}
            </div>

            <div className="field">
              <label htmlFor="new-role">Rôle</label>
              <select id="new-role" value={form.role} onChange={handleChange('role')}>
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              {formErrors.role && <span className="field-error">{formErrors.role}</span>}
            </div>

            <p className="form-hint">
              Un mot de passe temporaire sera envoyé à cette adresse ; l'utilisateur devra le changer à sa première connexion.
            </p>

            {formErrors.general && <div className="form-error">{formErrors.general}</div>}
            {successMessage && <div className="form-success">{successMessage}</div>}

            <button type="submit" disabled={submitting}>
              {submitting ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </section>

        <section className="admin-card users-card">
          <div className="card-header-row">
            <h2>Comptes existants</h2>
            <span className="count-pill">{users.length} compte{users.length > 1 ? 's' : ''}</span>
          </div>
          {listError && <div className="form-error">{listError}</div>}
          {resetMessage && <div className="form-success">{resetMessage}</div>}
          {loadingUsers ? (
            <p>Chargement...</p>
          ) : (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isSelf = user.username === auth.username;
                    const roleLabel = ROLES.find((r) => r.value === user.role)?.label || user.role;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <span className={`avatar ${roleClass(user.role)}`}>{initials(user.username)}</span>
                            <div className="user-cell-text">
                              <div className="user-name">
                                {user.username}
                                {isSelf && <span className="self-tag">vous</span>}
                              </div>
                              <div className="user-email">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${roleClass(user.role)}`}>{roleLabel}</span>
                        </td>
                        <td>
                          <span className={`status-dot ${user.active ? 'status-active' : 'status-inactive'}`}>
                            {user.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="row-menu-cell">
                          <button
                            type="button"
                            className="menu-trigger"
                            onClick={() => toggleMenu(user.id)}
                            aria-label="Actions"
                          >
                            ⋮
                          </button>
                          {menuOpenId === user.id && (
                            <div className="row-dropdown">
                              <button type="button" onClick={() => openEdit(user)}>Modifier</button>
                              <button
                                type="button"
                                disabled={isSelf || !user.active}
                                title={isSelf
                                  ? 'Pour votre compte, utilisez « Changer mon mot de passe ».'
                                  : !user.active ? 'Activez d’abord le compte.' : undefined}
                                onClick={() => openReset(user)}
                              >
                                Réinitialiser le mot de passe
                              </button>
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.active ? 'Désactiver' : 'Activer'}
                              </button>
                              <button
                                type="button"
                                className="dropdown-danger"
                                disabled={isSelf}
                                onClick={() => openDelete(user)}
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4}>Aucun compte pour le moment.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {editUser && (
        <Modal title={`Modifier ${editUser.username}`} onClose={closeEdit}>
          <form onSubmit={submitEdit} className="modal-form">
            <div className="field">
              <label htmlFor="edit-username">Nom d'utilisateur</label>
              <input
                id="edit-username"
                type="text"
                value={editForm.username}
                onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                required
              />
              {editErrors.username && <span className="field-error">{editErrors.username}</span>}
            </div>
            <div className="field">
              <label htmlFor="edit-email">Email</label>
              <input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              {editErrors.email && <span className="field-error">{editErrors.email}</span>}
            </div>
            <div className="field">
              <label htmlFor="edit-role">Rôle</label>
              <select
                id="edit-role"
                value={editForm.role}
                disabled={editUser.username === auth.username}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            {editErrors.general && <div className="form-error">{editErrors.general}</div>}
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={closeEdit}>Annuler</button>
              <button type="submit" disabled={editSubmitting}>
                {editSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {resetUser && (
        <Modal title="Réinitialiser le mot de passe" onClose={closeReset}>
          <p>
            Réinitialiser le mot de passe de <strong>{resetUser.username}</strong> ?
          </p>
          <div className="form-info">
            Un mot de passe temporaire sera envoyé à <strong>{resetUser.email}</strong>. L’ancien mot de passe ne
            fonctionnera plus, les sessions ouvertes seront fermées et l’utilisateur devra choisir un nouveau mot de
            passe à sa prochaine connexion. Vérifiez que cette adresse e-mail est correcte (sinon, modifiez-la d’abord).
          </div>
          {resetError && <div className="form-error">{resetError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={closeReset}>Annuler</button>
            <button type="button" disabled={resetSubmitting} onClick={confirmReset} autoFocus>
              {resetSubmitting ? 'Envoi...' : 'Réinitialiser et envoyer'}
            </button>
          </div>
        </Modal>
      )}

      {deleteUser && deleteUser.deletionBlockedReason && (
        <Modal title="Suppression impossible" onClose={closeDelete}>
          <p>
            Le compte <strong>{deleteUser.username}</strong> ne peut pas être supprimé.
          </p>
          <div className="form-info">{deleteUser.deletionBlockedReason}</div>
          {deleteError && <div className="form-error">{deleteError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={closeDelete}>Fermer</button>
            {deleteUser.active && (
              <button type="button" className="primary-btn" disabled={deleteSubmitting} onClick={deactivateInsteadOfDelete}>
                {deleteSubmitting ? 'Désactivation...' : 'Désactiver le compte'}
              </button>
            )}
          </div>
        </Modal>
      )}

      {deleteUser && !deleteUser.deletionBlockedReason && (
        <Modal title="Supprimer le compte" onClose={closeDelete}>
          <p className="modal-warning">
            Supprimer définitivement le compte <strong>{deleteUser.username}</strong> ? Cette action est irréversible.
          </p>
          {deleteError && <div className="form-error">{deleteError}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={closeDelete}>Annuler</button>
            <button type="button" className="danger-btn" disabled={deleteSubmitting} onClick={confirmDelete}>
              {deleteSubmitting ? 'Suppression...' : 'Supprimer définitivement'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
