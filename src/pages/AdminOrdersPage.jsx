
import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { getOrders, getUsers, setData } from '../utils/storage';

function AdminOrdersPage() {
  const [orders, setOrders] = useState(() => getOrders());
  const [users, setUsers] = useState(() => getUsers());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const refreshData = () => {
      setOrders(getOrders());
      setUsers(getUsers());
    };

    window.addEventListener('artGalleryStorageChange', refreshData);
    window.addEventListener('storage', refreshData);

    return () => {
      window.removeEventListener('artGalleryStorageChange', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, []);

  const getCustomer = (order) =>
    users.find((user) => String(user.id) === String(order.userId));

  const filteredOrders = orders.filter((order) => {
    const customer = getCustomer(order);
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      String(order.artworkTitle || '').toLowerCase().includes(query) ||
      String(order.artistName || '').toLowerCase().includes(query) ||
      String(customer?.name || '').toLowerCase().includes(query) ||
      String(customer?.email || '').toLowerCase().includes(query) ||
      String(order.id || '').toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'All' ||
      String(order.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const updateOrderStatus = (order, newStatus) => {
    const updatedOrders = orders.map((item) =>
      String(item.id) === String(order.id)
        ? { ...item, status: newStatus }
        : item
    );

    if (setData('artGalleryOrders', updatedOrders)) {
      setOrders(getOrders());
      setSelectedOrder((current) =>
        current && String(current.id) === String(order.id)
          ? { ...current, status: newStatus }
          : current
      );
      setMessage(`Order status updated to ${newStatus}.`);
    } else {
      setMessage('Unable to update order status.');
    }
  };

  const formatDate = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Not available'
      : date.toLocaleString();
  };

  const totalRevenue = orders.reduce(
    (total, order) =>
      total + Number(order.amount || 0),
    0
  );

  return (
    <>
      <Navbar />

      <main className="container page-shell">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Order Management</h1>
          <p>View customer purchases and manage order statuses.</p>
        </section>

        <section className="admin-stats-grid">
          <article className="admin-stat card">
            <span>Total Orders</span>
            <strong>{orders.length}</strong>
          </article>
          <article className="admin-stat card">
            <span>Confirmed Orders</span>
            <strong>
              {orders.filter((o) => o.status === 'Confirmed').length}
            </strong>
          </article>
          <article className="admin-stat card">
            <span>Completed Orders</span>
            <strong>
              {orders.filter((o) => o.status === 'Completed').length}
            </strong>
          </article>
          <article className="admin-stat card">
            <span>Total Order Value</span>
            <strong>{totalRevenue.toLocaleString()}</strong>
          </article>
        </section>

        <section className="card admin-user-controls">
          <label>
            Search orders
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Artwork, customer, email or order ID"
            />
          </label>

          <label>
            Filter by status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="All">All statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <span>{filteredOrders.length} orders</span>
        </section>

        {message && <p role="status">{message}</p>}

        <div className="admin-users-table-wrap card">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Artwork</th>
                <th>Amount</th>
                <th>Purchase Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order, index) => {
                const customer = getCustomer(order);

                return (
                  <tr key={order.id || index}>
                    <td>{String(order.id || '').slice(0, 8)}</td>
                    <td>
                      {customer?.name || 'Customer'}
                      <br />
                      {customer?.email || 'Email unavailable'}
                    </td>
                    <td>{order.artworkTitle || 'Artwork'}</td>
                    <td>{Number(order.amount || 0).toLocaleString()}</td>
                    <td>{order.purchaseType || 'Direct Purchase'}</td>
                    <td>{order.status || 'Unknown'}</td>
                    <td>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="7" className="admin-users-empty">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedOrder && (
          <div
            className="dialog-backdrop"
            role="presentation"
            onClick={() => setSelectedOrder(null)}
          >
            <section
              className="admin-user-dialog card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-order-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="eyebrow">Order Details</p>
              <h2 id="admin-order-dialog-title">
                {selectedOrder.artworkTitle || 'Artwork Order'}
              </h2>

              {selectedOrder.artworkImage && (
                <img
                  src={selectedOrder.artworkImage}
                  alt={selectedOrder.artworkTitle || 'Purchased artwork'}
                  style={{
                    width: '100%',
                    maxHeight: '220px',
                    objectFit: 'contain',
                  }}
                />
              )}

              <dl>
                <div>
                  <dt>Order ID</dt>
                  <dd>{selectedOrder.id}</dd>
                </div>
                <div>
                  <dt>Customer</dt>
                  <dd>{getCustomer(selectedOrder)?.name || 'Customer'}</dd>
                </div>
                <div>
                  <dt>Customer Email</dt>
                  <dd>{getCustomer(selectedOrder)?.email || 'Unavailable'}</dd>
                </div>
                <div>
                  <dt>Artist</dt>
                  <dd>{selectedOrder.artistName || 'Not specified'}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{Number(selectedOrder.amount || 0).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Purchase Type</dt>
                  <dd>{selectedOrder.purchaseType || 'Direct Purchase'}</dd>
                </div>
                <div>
                  <dt>Purchase Date</dt>
                  <dd>{formatDate(selectedOrder.createdAt)}</dd>
                </div>
                <div>
                  <dt>Current Status</dt>
                  <dd>{selectedOrder.status || 'Unknown'}</dd>
                </div>
              </dl>

              <label>
                Update order status
                <select
                  value={selectedOrder.status || 'Confirmed'}
                  onChange={(event) =>
                    updateOrderStatus(selectedOrder, event.target.value)
                  }
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </label>

              <Button onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}

export default AdminOrdersPage;
