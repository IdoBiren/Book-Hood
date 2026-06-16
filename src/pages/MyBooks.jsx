import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookPlus, Trash2, Send, Undo2, Edit2, Camera, Loader2, ScanBarcode, ImagePlus, CheckCircle, X } from 'lucide-react';
import { getUserBooks, getBorrowedBooks, addBook, deleteBook, editBook, lendBook, returnBook, getAllUsers, uploadBookCover, searchBookByIsbn } from '../services/db';
import BarcodeScanner from '../components/BarcodeScanner';
import { BOOK_GENRES } from '../utils/constants';

const getDaysRemaining = (dueDateStr) => {
  if (!dueDateStr) return null;
  const parts = dueDateStr.split('.');
  if (parts.length !== 3) return null;
  const due = new Date(parts[2], parts[1] - 1, parts[0]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function MyBooks() {
  const { currentUser, userProfile } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [books, setBooks] = useState([]);
  const [borrowedBooks, setBorrowedBooks] = useState([]);
  const [mockUsers, setMockUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newBook, setNewBook] = useState({ title: '', author: '', genre: '', coverImage: '', isbn: '' });
  const [editingBook, setEditingBook] = useState(null);
  const [lendingBookId, setLendingBookId] = useState(null);
  const [borrowerNameInput, setBorrowerNameInput] = useState('');
  const [borrowerIdInput, setBorrowerIdInput] = useState('');
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [editCoverFile, setEditCoverFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!currentUser) return;
      setLoading(true);
      
      const timeoutId = setTimeout(() => setLoading(false), 3000);
      
      try {
        const fetchedBooks = await getUserBooks(currentUser.uid);
        setBooks(fetchedBooks);
        const fetchedBorrowed = await getBorrowedBooks(currentUser.uid);
        setBorrowedBooks(fetchedBorrowed);
        const fetchedUsers = await getAllUsers();
        // Remove self from the lending list
        setMockUsers(fetchedUsers.filter(u => u.uid !== currentUser.uid));
      } catch (error) {
        console.error("Error fetching user books:", error);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const handleStartAddBook = () => {
    if (showAddForm || showScanner) {
      setShowAddForm(false);
      setShowScanner(false);
    } else {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setShowScanner(true);
      } else {
        setShowAddForm(true);
      }
    }
  };

  if (!currentUser) return <div className="text-center mt-8 glass-card"><h3>אנא התחברו כדי לצפות בספרים שלכם.</h3></div>;

  const handleBarcodeScan = async (isbn) => {
    setShowScanner(false);
    setIsScanning(true);
    try {
      const cleanIsbn = isbn.replace(/[^0-9X]/gi, '');
      let title = '';
      let author = '';
      let coverImage = '';
      let found = false;

      // 1. חיפוש קודם כל במאגר הקהילתי של ניר עוז (חוכמת ההמונים)
      const localBook = await searchBookByIsbn(cleanIsbn);
      if (localBook) {
        title = localBook.title || '';
        author = localBook.author || '';
        coverImage = localBook.coverImage || '';
        found = true;
      }

      // בדיקה אם המשתמש כבר העלה עותק של הספר הזה
      const alreadyOwned = books.some(b => (b.isbn && b.isbn === cleanIsbn) || (found && b.title === title));
      if (alreadyOwned) {
        const confirmAdd = window.confirm(`נראה שכבר העלית עותק של הספר "${title || 'הזה'}" למאגר! האם תרצה להוסיף עותק נוסף?`);
        if (!confirmAdd) {
          setIsScanning(false);
          return;
        }
      }

      setNewBook({
        ...newBook,
        isbn: cleanIsbn,
        title: found ? title : newBook.title,
        author: found ? author : newBook.author,
        coverImage: (found && coverImage) ? coverImage : newBook.coverImage
      });

      setShowAddForm(true);
    } catch (err) {
      console.error("Error fetching ISBN data:", err);
      alert("אירעה שגיאה בחיפוש הברקוד.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddBook = async (e) => {
    e.preventDefault();
    if (!newBook.title || !newBook.author || !newBook.genre) return;
    setIsUploading(true);
    try {
      let finalCover = newBook.coverImage || '';
      
      const bookToAdd = {
        title: newBook.title,
        author: newBook.author,
        genre: newBook.genre,
        isbn: newBook.isbn,
        coverImage: finalCover
      };

      const addedBook = await addBook(bookToAdd, currentUser);
      
      if (newCoverFile) {
        const downloadUrl = await uploadBookCover(newCoverFile, addedBook.id);
        if (downloadUrl) {
          await editBook(addedBook.id, { ...bookToAdd, coverImage: downloadUrl });
          addedBook.coverImage = downloadUrl;
        }
      }

      setBooks([...books, addedBook]);
      setNewBook({ title: '', author: '', genre: '', coverImage: '', isbn: '' });
      setShowAddForm(false);
      setNewCoverFile(null);
      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);
    } catch (err) {
      console.error("Error adding book", err);
      alert('אירעה שגיאה בהוספת הספר.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBook(id);
      setBooks(books.filter(b => b.id !== id));
    } catch (err) {
      console.error("Error deleting book", err);
      alert('אירעה שגיאה במחיקת הספר.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBook.title || !editingBook.author) return;
    setIsUploading(true);
    
    try {
      let finalCoverImage = editingBook.coverImage;
      
      if (editCoverFile) {
        const downloadUrl = await uploadBookCover(editCoverFile, editingBook.id);
        if (downloadUrl) {
          finalCoverImage = downloadUrl;
        }
      }
      
      await editBook(editingBook.id, {
        title: editingBook.title,
        author: editingBook.author,
        genre: editingBook.genre,
        coverImage: finalCoverImage
      });
      setBooks(books.map(b => b.id === editingBook.id ? { ...b, ...editingBook, coverImage: finalCoverImage } : b));
      setEditingBook(null);
      setEditCoverFile(null);
    } catch (err) {
      console.error("Error editing book", err);
      alert("אירעה שגיאה בעדכון הספר.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLendBook = async (id) => {
    if (!borrowerIdInput) return;
    const borrower = mockUsers.find(u => (u.uid || u.id) === borrowerIdInput);
    if (!borrower) return;
    const borrowerName = borrower.displayName || borrower.name;
    const date = new Date();
    date.setMonth(date.getMonth() + 2);
    const dueDateStr = date.toLocaleDateString('he-IL');
    
    try {
      await lendBook(id, borrowerIdInput, borrowerName, dueDateStr);
      setBooks(books.map(b => b.id === id ? {
        ...b,
        status: 'borrowed',
        borrowerId: borrowerIdInput,
        borrowerName: borrowerName,
        dueDate: dueDateStr
      } : b));
      setLendingBookId(null);
      setBorrowerIdInput('');
      setBorrowerNameInput('');
    } catch (err) {
      console.error("Error lending book", err);
      alert('אירעה שגיאה בסימון הספר כמושאל.');
    }
  };

  const handleReturnBook = async (id) => {
    try {
      await returnBook(id);
      setBooks(books.map(b => b.id === id ? {
        ...b,
        status: 'available',
        borrowerName: null,
        dueDate: null
      } : b));
    } catch (err) {
      console.error("Error returning book", err);
      alert('אירעה שגיאה בהחזרת הספר.');
    }
  };

  const futureDateStr = new Date(new Date().setMonth(new Date().getMonth() + 2)).toLocaleDateString('he-IL');

  return (
    <div className="animate-fade-in">
      {showSuccessPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card animate-fade-in text-center" style={{ width: '90%', maxWidth: '400px', padding: '2.5rem', background: 'var(--surface-color)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle size={32} />
            </div>
            <h2 style={{ color: 'var(--success-color)', marginBottom: '1rem', fontSize: '1.5rem' }}>הספר נוסף בהצלחה!</h2>
            <p className="text-muted" style={{ marginBottom: '1.5rem' }}>הספר זמין כעת בספרייה הקהילתית ומוכן להשאלה.</p>
            <button className="btn btn-primary w-full" onClick={() => setShowSuccessPopup(false)} style={{ justifyContent: 'center', padding: '0.8rem' }}>
              מעולה
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScan} 
          onClose={() => setShowScanner(false)} 
          onManualEntry={() => {
            setShowScanner(false);
            setShowAddForm(true);
          }}
        />
      )}
      <div className="flex items-center justify-between mb-8 flex-mobile-col">
        <div>
          <h1 className="mb-2">האזור האישי</h1>
          <p className="text-muted">ניהול ההשאלות והספרים שלך במאגר</p>
        </div>
        <button className="btn btn-primary shadow hover-lift" onClick={handleStartAddBook}>
          {showAddForm || showScanner ? <Undo2 size={20} /> : <BookPlus size={20} />}
          {showAddForm || showScanner ? 'ביטול הוספה' : 'הוסף ספר למאגר'}
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ padding: '1.5rem' }}>
            <div className="flex justify-center items-center mb-6">
              <h3 className="m-0 flex items-center gap-2"><BookPlus style={{ color: 'var(--primary-color)' }} /> הוספת ספר חדש</h3>
            </div>

          <form onSubmit={handleAddBook}>
            {newBook.isbn && (
              <div className="input-group">
                <label className="input-label">ברקוד שנסרק (ISBN)</label>
                <div style={{ padding: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {newBook.isbn}
                </div>
              </div>
            )}
            <div className="input-group">
              <label className="input-label">שם הספר</label>
              <input type="text" className="input-field" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} placeholder="לדוגמה: שר הטבעות" required />
            </div>
            <div className="input-group">
              <label className="input-label">שם המחבר</label>
              <input type="text" className="input-field" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} placeholder="לדוגמה: ג'.ר.ר. טולקין" required />
            </div>
            <div className="input-group">
              <label className="input-label">ז'אנר / קטגוריה (לא חובה)</label>
              <select className="input-field" value={newBook.genre} onChange={e => setNewBook({...newBook, genre: e.target.value})}>
                <option value="" disabled>בחרו קטגוריה מתאימה</option>
                {BOOK_GENRES.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">תמונת כריכה (לא חובה)</label>
              <div className="flex gap-2 items-center">
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  onChange={(e) => {
                    if (e.target.files[0]) setNewCoverFile(e.target.files[0]);
                  }}
                  style={{ display: 'none' }}
                  id="new-cover-camera"
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files[0]) setNewCoverFile(e.target.files[0]);
                  }}
                  style={{ display: 'none' }}
                  id="new-cover-gallery"
                />
                <label htmlFor="new-cover-camera" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                  <Camera size={18} /> מצלמה
                </label>
                <label htmlFor="new-cover-gallery" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                  <ImagePlus size={18} /> גלריה
                </label>
              </div>
              {newCoverFile && <div className="text-sm mt-2 text-center" style={{ color: 'var(--primary-color)' }}>נבחרה תמונה: {newCoverFile.name}</div>}
            </div>
            <div className="mt-6 flex justify-between gap-4">
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isUploading}>
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> מפעיל קסמים...</> : 'הוסף למאגר'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddForm(false)}>
                ביטול
              </button>
            </div>
          </form>
        </div>
        </div>
      )}

      {loading ? (
        <div className="text-center mt-8 glass-card">
          <h3>טוען נתונים...</h3>
        </div>
      ) : (
        <>
          {/* Borrowed Books Section */}
          {borrowedBooks.length > 0 && (
            <>
              <div className="flex justify-between items-end mb-6 mt-4">
                <div>
                  <h2 className="mb-2">ספרים שהשאלתי מאחרים</h2>
                  <p className="text-muted">ספרים שנמצאים אצלי כרגע</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {borrowedBooks.map(book => {
                const daysRemaining = getDaysRemaining(book.dueDate);
                return (
                  <div key={book.id} className="glass-card flex" style={{ padding: '0', overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch' }}>
                    <div className="flex-col justify-between flex" style={{ padding: '0.25rem 1rem 1rem 1rem', flex: 1 }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{book.title}</h4>
                        <p className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>{book.author}</p>
                        <p style={{ fontSize: '1rem', color: 'var(--primary-color)', fontWeight: '600' }}>{book.genre}</p>
                      </div>
                      <div className="mt-4 flex flex-col justify-between" style={{ gap: '0.5rem' }}>
                        <div className="flex flex-col items-start gap-2">
                           <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              <span style={{display: 'block'}}>שייך ל: <strong>{book.ownerName}</strong></span>
                              <span style={{display: 'block'}}>תאריך החזרה: <strong>{book.dueDate}</strong></span>
                              {daysRemaining !== null && (
                                <span style={{
                                  display: 'block', 
                                  color: daysRemaining < 0 ? 'var(--danger-color)' : daysRemaining <= 7 ? 'var(--warning-color)' : 'var(--success-color)',
                                  fontWeight: 'bold',
                                  marginTop: '0.25rem'
                                }}>
                                  {daysRemaining < 0 
                                    ? `באיחור של ${Math.abs(daysRemaining)} ימים!` 
                                    : daysRemaining === 0 
                                      ? 'יש להחזיר היום!'
                                      : `נשארו ${daysRemaining} ימים להחזרה`}
                                </span>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>

                    {book.coverImage && (
                      <div style={{ width: '120px', flexShrink: 0, background: '#f8fafc', borderRight: '1px solid var(--surface-border)' }}>
                        <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            </>
          )}

          {/* My Books Section */}
          <div className="flex justify-between items-end mb-6 mt-12">
            <div>
              <h2 className="mb-2">ספרים שתרמתי למאגר</h2>
              <p className="text-muted">ניהול הספרים שהעליתי לספרייה</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.length === 0 ? (
              <div className="glass-card text-center" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
                <h3>אין לכם ספרים כרגע במאגר</h3>
                <p>לא נמצאו ספרים. זה הזמן להוסיף את הספר הראשון שלך!</p>
              </div>
            ) : (
              books.map(book => (
                <div key={book.id} className="glass-card flex hover-lift" style={{ padding: '0', overflow: 'hidden', flexDirection: 'row', alignItems: 'stretch' }}>
                  <div className="flex-col justify-between flex" style={{ padding: '0.25rem 1rem 1rem 1rem', flex: 1 }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{book.title}</h4>
                      <p className="text-muted" style={{ fontSize: '1rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>{book.author}</p>
                      <p style={{ fontSize: '1rem', color: 'var(--primary-color)', fontWeight: '600' }}>{book.genre}</p>
                    </div>
                    <div className="mt-4 flex flex-col justify-between" style={{ gap: '0.5rem' }}>
                      <div className="flex flex-col items-start gap-2">
                        <span style={{ 
                          fontSize: '0.9rem', 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '1rem', 
                          background: book.status === 'available' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: book.status === 'available' ? 'var(--success-color)' : 'var(--danger-color)'
                        }}>
                          {book.status === 'available' ? 'זמין להשאלה' : 'מושאל'}
                        </span>
                        {book.status === 'borrowed' && book.borrowerName && (
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                             <span style={{display: 'block'}}>אצל: <strong>{book.borrowerName}</strong></span>
                             <span style={{display: 'block'}}>החזרה: <strong>{book.dueDate}</strong></span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {book.status === 'available' ? (
                          <button onClick={() => setLendingBookId(book.id)} className="btn btn-primary" style={{ padding: '0.6rem', fontSize: '1rem', width: '100%', justifyContent: 'center' }} title="סמן כמושאל לחבר">
                            <Send size={18} /> השאל
                          </button>
                        ) : (
                          <button onClick={() => handleReturnBook(book.id)} className="btn btn-secondary" style={{ padding: '0.6rem', fontSize: '1rem', color: 'var(--success-color)', borderColor: 'var(--success-color)', width: '100%', justifyContent: 'center' }} title="סמן שהוחזר אלי">
                            <Undo2 size={18} /> הוחזר
                          </button>
                        )}
                        <div className="flex gap-2 w-full mt-1">
                          <button onClick={() => setEditingBook(book)} className="btn btn-secondary" style={{ padding: '0.6rem', fontSize: '1rem', flex: 1, justifyContent: 'center' }} title="ערוך ספר">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(book.id)} className="btn btn-danger" style={{ padding: '0.6rem', fontSize: '1rem', flex: 1, justifyContent: 'center' }} title="מחק ספר מהמערכת">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {book.coverImage && (
                    <div style={{ width: '120px', flexShrink: 0, background: '#f8fafc', borderRight: '1px solid var(--surface-border)' }}>
                      <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Editing Modal */}
      {editingBook && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card animate-fade-in" style={{ background: '#fff', width: '90%', maxWidth: '500px', border: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 className="mb-4">עריכת ספר</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="input-group">
                <label className="input-label">שם הספר</label>
                <input type="text" className="input-field" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">שם המחבר</label>
                <input type="text" className="input-field" value={editingBook.author} onChange={e => setEditingBook({...editingBook, author: e.target.value})} required />
              </div>
              <div className="input-group">
                <label className="input-label">ז'אנר / קטגוריה (לא חובה)</label>
                <select className="input-field" value={editingBook.genre} onChange={e => setEditingBook({...editingBook, genre: e.target.value})}>
                  {BOOK_GENRES.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">תמונת כריכה</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files[0]) setEditCoverFile(e.target.files[0]);
                    }}
                    style={{ display: 'none' }}
                    id="edit-cover-camera"
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files[0]) setEditCoverFile(e.target.files[0]);
                    }}
                    style={{ display: 'none' }}
                    id="edit-cover-gallery"
                  />
                  <label htmlFor="edit-cover-camera" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                    <Camera size={18} /> מצלמה
                  </label>
                  <label htmlFor="edit-cover-gallery" className="btn btn-secondary hover-lift" style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', flex: 1, margin: 0, justifyContent: 'center', padding: '0.5rem', whiteSpace: 'nowrap' }}>
                    <ImagePlus size={18} /> גלריה
                  </label>
                </div>
                {editCoverFile && <div className="text-sm mt-2 text-center" style={{ color: 'var(--primary-color)' }}>נבחרה תמונה: {editCoverFile.name}</div>}
              </div>
              <div className="flex gap-4 mt-6">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={isUploading}>
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : 'שמור שינויים'}
                </button>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setEditingBook(null); setEditCoverFile(null); }}>ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lending Modal */}
      {lendingBookId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card animate-fade-in" style={{ background: '#fff', width: '90%', maxWidth: '450px', border: 'none' }}>
            <h3 className="mb-4">למי השאלת את הספר?</h3>
            <div className="input-group">
               <label className="input-label">בחר חבר קהילה מהרשימה</label>
               <select className="input-field" value={borrowerIdInput} onChange={e => setBorrowerIdInput(e.target.value)}>
                 <option value="" disabled>בחר חבר...</option>
                 {mockUsers.map(u => (
                   <option key={u.uid || u.id} value={u.uid || u.id}>{u.displayName || u.name}</option>
                 ))}
               </select>
            </div>
            <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>
              הספר יסומן כמושאל, ותאריך ההחזרה ייקבע אוטומטית לעוד חודשיים:<br/><strong style={{color: 'var(--text-main)', fontSize: '1.2rem'}}>{futureDateStr}</strong>.
            </p>
            <div className="flex gap-4">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleLendBook(lendingBookId)}>אישור השאלה</button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setLendingBookId(null); setBorrowerIdInput(''); setBorrowerNameInput(''); }}>ביטול</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
