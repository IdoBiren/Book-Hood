import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Trash2, Edit2, Loader2, Save, X, BookCopy, Database, Camera, ImagePlus } from 'lucide-react';
import { getAllBooksAdmin, deleteBook, uploadBookCover, updateCatalogMetadata } from '../services/db';
import { BOOK_GENRES } from '../utils/constants';

export default function AdminDashboard() {
  const { currentUser, userProfile } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'catalog'
  
  const [editingCatalogKey, setEditingCatalogKey] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', author: '', genre: '', isbn: '' });
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userProfile?.isAdmin) {
      loadAllBooks();
    }
  }, [userProfile]);

  const loadAllBooks = async () => {
    setLoading(true);
    try {
      const allBooks = await getAllBooksAdmin();
      setBooks(allBooks);
    } catch (err) {
      console.error("Error loading admin books:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || !userProfile?.isAdmin) {
    return (
      <div className="text-center mt-12 glass-card">
        <ShieldAlert size={48} color="var(--danger-color)" style={{ margin: '0 auto 1rem' }} />
        <h2>גישה חסומה</h2>
        <p>אין לך הרשאות ניהול לצפייה בעמוד זה.</p>
      </div>
    );
  }

  const handleDeleteCopy = async (id, title) => {
    if (window.confirm(`האם למחוק לצמיתות את העותק של "${title}"? פעולה זו אינה הפיכה!`)) {
      try {
        await deleteBook(id);
        setBooks(books.filter(b => b.id !== id));
      } catch (err) {
        console.error("Error deleting book:", err);
        alert("שגיאה במחיקת הספר.");
      }
    }
  };

  const startEditCatalog = (book) => {
    setEditingCatalogKey(book.catalogKey);
    setEditForm({
      title: book.title || '',
      author: book.author || '',
      genre: book.genre || '',
      isbn: book.isbn || ''
    });
    setNewCoverFile(null);
  };

  const handleSaveCatalogEdit = async (book) => {
    setIsSaving(true);
    try {
      let updatedData = { ...editForm };
      
      if (newCoverFile) {
        const downloadUrl = await uploadBookCover(newCoverFile, `cat_${book.catalogKey}`);
        if (downloadUrl) {
          updatedData.coverImage = downloadUrl;
        }
      }
      
      await updateCatalogMetadata(book.catalogKey, book.isIsbn, updatedData);
      
      setBooks(books.map(b => {
        const key = b.isbn || b.id;
        if (key === book.catalogKey) {
          return { ...b, ...updatedData };
        }
        return b;
      }));
      setEditingCatalogKey(null);
    } catch (err) {
      console.error("Error saving catalog:", err);
      alert("שגיאה בעדכון הקטלוג.");
    } finally {
      setIsSaving(false);
    }
  };

  const catalogMap = new Map();
  books.forEach(b => {
    const key = b.isbn || b.id;
    if (!catalogMap.has(key)) {
      catalogMap.set(key, { ...b, copiesCount: 1, catalogKey: key, isIsbn: !!b.isbn });
    } else {
      catalogMap.get(key).copiesCount += 1;
    }
  });
  const catalogBooks = Array.from(catalogMap.values());

  if (loading) {
    return <div className="text-center mt-12"><Loader2 size={32} className="spin text-muted" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-8 flex-mobile-col">
        <h2>ניהול המערכת 👑</h2>
        <div className="flex gap-2">
          <button 
            className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('inventory')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <BookCopy size={18} /> מלאי עותקים ({books.length})
          </button>
          <button 
            className={`btn ${activeTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('catalog')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Database size={18} /> מאגר קטלוגי ({catalogBooks.length})
          </button>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <div className="glass-card fade-in" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem' }}>ספר</th>
                <th style={{ padding: '1rem' }}>בעלים</th>
                <th style={{ padding: '1rem' }}>סטטוס</th>
                <th style={{ padding: '1rem' }}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div className="flex items-center gap-3">
                      <img src={book.coverImage} alt={book.title} style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{book.title}</div>
                        <div className="text-sm text-muted">{book.author}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div>{book.ownerName}</div>
                    <div className="text-sm text-muted">{book.ownerPhone}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {book.status === 'available' ? (
                      <span style={{ color: 'var(--success-color)', fontWeight: 600 }}>זמין</span>
                    ) : (
                      <div>
                        <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>מושאל ל: {book.borrowerName}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => handleDeleteCopy(book.id, book.title)} className="btn" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626' }} title="מחק עותק זה">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem' }}>אין עותקים במערכת.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="glass-card fade-in" style={{ padding: 0, overflowX: 'auto' }}>
          <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-color)', fontSize: '0.9rem', borderBottom: '1px solid var(--surface-border)' }}>
            <strong>שימו לב:</strong> עריכת פרטים (שם, סופר, תמונה) במסך זה תעדכן באופן גורף את <strong>כל</strong> העותקים של אותו הספר במערכת.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--surface-border)', background: 'rgba(0,0,0,0.02)' }}>
                <th style={{ padding: '1rem' }}>תמונה</th>
                <th style={{ padding: '1rem' }}>פרטי קטלוג</th>
                <th style={{ padding: '1rem' }}>עותקים</th>
                <th style={{ padding: '1rem' }}>עריכה גורפת</th>
              </tr>
            </thead>
            <tbody>
              {catalogBooks.map(book => (
                <tr key={book.catalogKey} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    {book.coverImage ? (
                      <img src={book.coverImage} alt={book.title} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '50px', height: '70px', background: '#e2e8f0', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{book.title}</div>
                    <div className="text-sm text-muted">{book.author} | {book.genre}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--primary-color)' }}>ISBN: {book.isbn || 'אין ברקוד'}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                    {book.copiesCount}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button onClick={() => startEditCatalog(book)} className="btn btn-secondary" style={{ padding: '0.5rem' }} title="ערוך פרטי ספר במאגר">
                      <Edit2 size={16} /> ערוך ספר
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editing Modal */}
      {editingCatalogKey && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card animate-fade-in" style={{ background: '#fff', width: '90%', maxWidth: '500px', border: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="mb-4">עריכת פרטי ספר (גורף)</h3>
            <div className="grid" style={{ gap: '1rem' }}>
              <div className="input-group">
                <label className="input-label">שם הספר</label>
                <input type="text" className="input-field" placeholder="שם הספר" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">סופר</label>
                <input type="text" className="input-field" placeholder="סופר" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} />
              </div>
              <div className="input-group">
                <label className="input-label">ז'אנר / קטגוריה (לא חובה)</label>
                <select className="input-field" value={editForm.genre} onChange={e => setEditForm({...editForm, genre: e.target.value})}>
                  <option value="" disabled>בחרו קטגוריה מתאימה</option>
                  {BOOK_GENRES.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">עדכון תמונת כריכה</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files[0]) setNewCoverFile(e.target.files[0]);
                    }}
                    style={{ display: 'none' }}
                    id="admin-cover-camera"
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files[0]) setNewCoverFile(e.target.files[0]);
                    }}
                    style={{ display: 'none' }}
                    id="admin-cover-gallery"
                  />
                  <label htmlFor="admin-cover-camera" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                    <Camera size={18} /> מצלמה
                  </label>
                  <label htmlFor="admin-cover-gallery" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                    <ImagePlus size={18} /> גלריה
                  </label>
                </div>
                {newCoverFile && <div className="text-sm mt-2 text-center" style={{ color: 'var(--primary-color)' }}>נבחרה תמונה: {newCoverFile.name}</div>}
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => {
                  const bookToSave = catalogBooks.find(b => b.catalogKey === editingCatalogKey);
                  if(bookToSave) handleSaveCatalogEdit(bookToSave);
                }} 
                disabled={isSaving} 
                className="btn btn-primary" style={{ flex: 1 }}
              >
                {isSaving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} שמור שינויים
              </button>
              <button onClick={() => setEditingCatalogKey(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
