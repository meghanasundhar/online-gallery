
import { useEffect, useState } from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import Button from '../components/common/Button';
import { getData, setData } from '../utils/storage';
import './AdminCategoriesPage.css';

const CATEGORY_KEY = 'artGalleryCategories';

const DEFAULT_CATEGORIES = [
  { id: 'painting', name: 'Painting', description: 'Paintings and canvas art' },
  { id: 'digital-art', name: 'Digital Art', description: 'Digitally created artwork' },
  { id: 'photography', name: 'Photography', description: 'Photographic artwork' },
  { id: 'sculpture', name: 'Sculpture', description: 'Three-dimensional artwork' },
  { id: 'sketch', name: 'Sketch', description: 'Pencil and ink drawings' },
];

function AdminCategoriesPage() {
  const [categories, setCategories] = useState(() => {
    const saved = getData(CATEGORY_KEY, null);
    return Array.isArray(saved) ? saved : DEFAULT_CATEGORIES;
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (getData(CATEGORY_KEY, null) === null) {
      setData(CATEGORY_KEY, DEFAULT_CATEGORIES);
    }
  }, []);

  const saveCategories = (updated) => {
    if (setData(CATEGORY_KEY, updated)) {
      setCategories(updated);
      setMessage('Categories saved successfully.');
    } else {
      setMessage('Unable to save categories. Please try again.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      setMessage('Please enter a category name.');
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() === cleanName.toLowerCase() &&
        String(category.id) !== String(editingId)
    );

    if (duplicate) {
      setMessage('This category already exists.');
      return;
    }

    if (editingId !== null) {
      const updated = categories.map((category) =>
        String(category.id) === String(editingId)
          ? { ...category, name: cleanName, description: cleanDescription }
          : category
      );
      saveCategories(updated);
    } else {
      const newCategory = {
        id: globalThis.crypto?.randomUUID?.() ?? `category-${Date.now()}`,
        name: cleanName,
        description: cleanDescription,
      };
      saveCategories([...categories, newCategory]);
    }

    setName('');
    setDescription('');
    setEditingId(null);
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setName(category.name);
    setDescription(category.description || '');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setMessage('');
  };

  const deleteCategory = (category) => {
    const confirmed = window.confirm(
      `Delete the category "${category.name}"?`
    );
    if (!confirmed) return;

    saveCategories(
      categories.filter(
        (item) => String(item.id) !== String(category.id)
      )
    );

    if (String(editingId) === String(category.id)) cancelEdit();
  };

  return (
    <>
      <Navbar />

      <main className="container page-shell admin-categories-page">
        <section className="page-header">
          <p className="eyebrow">Administration</p>
          <h1>Category Management</h1>
          <p>Create and manage categories for your art gallery.</p>
        </section>

        <section className="card admin-category-form-card">
          <h2>{editingId !== null ? 'Edit Category' : 'Add New Category'}</h2>

          <form onSubmit={handleSubmit} className="admin-category-form">
            <label>
              Category Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Watercolor"
                maxLength={60}
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe this category"
                maxLength={250}
                rows={3}
              />
            </label>

            <div className="admin-category-form-actions">
              <Button type="submit">
                {editingId !== null ? 'Save Changes' : 'Add Category'}
              </Button>

              {editingId !== null && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>

          {message && <p role="status" className="admin-category-message">{message}</p>}
        </section>

        <section className="admin-category-list-section">
          <div className="admin-category-list-heading">
            <h2>All Categories</h2>
            <span>{categories.length} categories</span>
          </div>

          {categories.length === 0 ? (
            <div className="card admin-category-empty">
              No categories yet. Add your first category above.
            </div>
          ) : (
            <div className="admin-category-grid">
              {categories.map((category) => (
                <article className="card admin-category-card" key={category.id}>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description || 'No description provided.'}</p>
                  </div>

                  <div className="admin-category-actions">
                    <Button
                      variant="outline"
                      onClick={() => startEdit(category)}
                    >
                      Edit
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={() => deleteCategory(category)}
                    >
                      Delete
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}

export default AdminCategoriesPage;
