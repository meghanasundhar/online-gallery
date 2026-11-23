import { useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import useAuth from '../hooks/useAuth';
import { getUsers, isAccountActive, updateUserAccountStatus } from '../utils/storage';

function AdminUsersPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState(() => getUsers());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);

  const accountStatusLabel = (user) => user.accountStatus
    || (typeof user.isActive === 'boolean' ? (user.isActive ? 'Active' : 'Inactive') : user.status || 'Active');

  const filteredUsers = users.filter((user) => {
    const name = String(user.name ?? '').toLowerCase();
    const email = String(user.email ?? '').toLowerCase();
    const matchesQuery = !search.trim() || name.includes(search.trim().toLowerCase()) || email.includes(search.trim().toLowerCase());
    const role = String(user.role ?? 'Unknown').toLowerCase();
    const matchesRole = roleFilter === 'All' || role === roleFilter.toLowerCase();
    return matchesQuery && matchesRole;
  });

  const changeStatus = (user) => {
    if (String(user.id) === String(currentUser.id)) return;
    const currentlyActive = isAccountActive(user);
    const action = currentlyActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name || user.email || 'this account'}?`)) return;
    updateUserAccountStatus(user.id, !currentlyActive);
    const updatedUsers = getUsers();
    setUsers(updatedUsers);
    setSelectedUser((selected) => selected && String(selected.id) === String(user.id)
      ? updatedUsers.find((entry) => String(entry.id) === String(user.id)) ?? null
      : selected);
  };

  return (
    <>
      <Navbar />
      <main className="container page-shell admin-users-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>User Management</h1>
          <p>Review registered accounts and account status.</p>
        </section>

        <section className="admin-user-controls card" aria-label="User search and filters">
          <label className="admin-user-search">Search users<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
          <label>Filter by role<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option>All</option><option>Visitor</option><option>Artist</option><option>Admin</option></select></label>
          <span>{filteredUsers.length} users</span>
        </section>

        <div className="admin-users-table-wrap card">
          <table className="admin-users-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Account Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredUsers.map((user, index) => {
                const active = isAccountActive(user);
                const isCurrentAdmin = String(user.id) === String(currentUser.id);
                return (
                  <tr key={user.id ?? `${user.email ?? 'account'}-${index}`}>
                    <td>{user.name || 'Unnamed user'}{isCurrentAdmin && <span className="admin-self-label">You</span>}</td>
                    <td>{user.email || 'No email'}</td>
                    <td><span className={`admin-role admin-role--${String(user.role ?? 'unknown').toLowerCase()}`}>{user.role || 'Unknown'}</span></td>
                    <td><span className={`account-status ${active ? 'account-status--active' : 'account-status--inactive'}`}>{accountStatusLabel(user)}</span></td>
                    <td><div className="admin-user-actions"><Button variant="outline" onClick={() => setSelectedUser(user)}>View</Button><Button variant="secondary" disabled={isCurrentAdmin || user.id == null} onClick={() => changeStatus(user)}>{active ? 'Deactivate' : 'Activate'}</Button></div></td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && <tr><td colSpan="5" className="admin-users-empty">No users match this search.</td></tr>}
            </tbody>
          </table>
        </div>

        {selectedUser && (
          <div className="dialog-backdrop" role="presentation" onClick={() => setSelectedUser(null)}>
            <section className="admin-user-dialog card" role="dialog" aria-modal="true" aria-labelledby="admin-user-dialog-title" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="dialog-close" aria-label="Close user details" onClick={() => setSelectedUser(null)}>×</button>
              <p className="eyebrow">Account details</p>
              <h2 id="admin-user-dialog-title">{selectedUser.name || 'Unnamed user'}</h2>
              <dl>
                <div><dt>Email</dt><dd>{selectedUser.email || 'Not provided'}</dd></div>
                <div><dt>Role</dt><dd>{selectedUser.role || 'Unknown'}</dd></div>
                <div><dt>Status</dt><dd>{accountStatusLabel(selectedUser)}</dd></div>
                <div><dt>Created</dt><dd>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'Not available'}</dd></div>
                <div><dt>Bio</dt><dd>{selectedUser.bio || 'No bio provided.'}</dd></div>
              </dl>
              <Button onClick={() => setSelectedUser(null)}>Close</Button>
            </section>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default AdminUsersPage;