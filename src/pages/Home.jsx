import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Library, BookOpen, MessageCircle, Search, Filter, ArrowUpDown } from 'lucide-react';
import { getAvailableBooks } from '../services/db';
import { BOOK_GENRES } from '../utils/constants';

export default function Home() {
  const { currentUser, isDemoMode } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter and sort logic
  const filteredBooks = books.filter(book => {
    const searchLower = searchQuery.toLowerCase();
    const titleMatch = book.title?.toLowerCase().includes(searchLower);
    const authorMatch = book.author?.toLowerCase().includes(searchLower);
    const matchesSearch = !searchQuery || titleMatch || authorMatch;
    
    const matchesGenre = selectedGenre ? book.genre === selectedGenre : true;
    
    return matchesSearch && matchesGenre;
  }).sort((a, b) => {
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'he');
    if (sortBy === 'title-desc') return b.title.localeCompare(a.title, 'he');
    if (sortBy === 'author-asc') return a.author.localeCompare(b.author, 'he');
    // Default to newest
    const dateA = a.createdAt?.seconds || Date.parse(a.createdAt) || 0;
    const dateB = b.createdAt?.seconds || Date.parse(b.createdAt) || 0;
    return dateB - dateA;
  });

  useEffect(() => {
    async function fetchBooks() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      const timeoutId = setTimeout(() => setLoading(false), 3000);
      
      try {
        const availableBooks = await getAvailableBooks();
        setBooks(availableBooks);
      } catch (error) {
        console.error("Failed to fetch books:", error);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    fetchBooks();
  }, [currentUser]);

  return (
    <div className="animate-fade-in">
      {isDemoMode && (
        <div className="glass-card mb-4" style={{ borderColor: 'var(--warning-color)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
          <p className="text-center" style={{ color: 'var(--warning-color)', fontWeight: 600 }}>
            שימו לב: האפליקציה רצה במצב הדגמה (Demo) כיוון ש-Firebase לא הוגדר. מידע ישמר באופן מקומי בלבד.
          </p>
        </div>
      )}

      <div className="text-center mb-6 mt-4">
        <h1 className="mb-4" style={{ fontSize: '2.5rem' }}>הספרים הזמינים בקהילה</h1>
        <p className="text-muted" style={{ fontSize: '1.2rem' }}>מצאו ספרים מעניינים להשאלה מחברי הקהילה שלכם</p>
      </div>

      <div className="flex justify-center w-full mb-10">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'var(--surface-color)', 
          borderRadius: '100px', 
          border: '1px solid var(--surface-border)', 
          padding: '0.3rem 0.8rem', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          gap: '0.5rem',
          flexWrap: 'wrap',
          maxWidth: '850px',
          width: '100%'
        }}>
          
          <div style={{ flex: '2 1 200px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="חיפוש חופשי..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', 
                padding: '0.5rem 2.2rem 0.5rem 0.5rem', fontSize: '1rem', color: 'var(--text-main)' 
              }}
            />
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)', margin: '0 0.5rem' }} className="hidden-mobile"></div>
          
          <div style={{ flex: '1 1 120px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter size={16} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)} 
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                padding: '0.5rem 0.5rem 0.5rem 1.8rem', textIndent: '1.5rem', fontSize: '1rem', color: 'var(--text-main)', appearance: 'none'
              }}
            >
              <option value="">כל הקטגוריות</option>
              {BOOK_GENRES.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--surface-border)', margin: '0 0.5rem' }} className="hidden-mobile"></div>

          <div style={{ flex: '1 1 120px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <ArrowUpDown size={16} style={{ position: 'absolute', right: '8px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)} 
              style={{ 
                width: '100%', border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer',
                padding: '0.5rem 0.5rem 0.5rem 1.8rem', textIndent: '1.5rem', fontSize: '1rem', color: 'var(--text-main)', appearance: 'none'
              }}
            >
              <option value="newest">הכי חדשים</option>
              <option value="title-asc">א-ת (ספר)</option>
              <option value="title-desc">ת-א (ספר)</option>
              <option value="author-asc">א-ת (סופר)</option>
            </select>
          </div>
          
        </div>
      </div>

      {!currentUser ? (
        <div className="glass-card text-center hover-lift" style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
          <Library size={64} style={{ color: 'var(--primary-color)', margin: '0 auto 1rem', opacity: 0.8 }} />
          <h2>התחברו כדי לצפות ולהשאיל ספרים</h2>
          <p className="text-muted mt-2">התחברו עם חשבון הגוגל שלכם בלחיצת כפתור אחת למעלה ותתחילו להשאיל!</p>
        </div>
      ) : (
        <div className="grid grid-cols-4">
          {loading ? (
            <div className="glass-card text-center" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
              <h3>טוען ספרים...</h3>
            </div>
          ) : books.length === 0 ? (
            <div className="glass-card text-center hover-lift" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
               <BookOpen size={64} style={{ color: 'var(--text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
               <h3>אין ספרים זמינים כרגע</h3>
               <p className="text-muted mt-2">היו הראשונים להוסיף ספר לספרייה!</p>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="glass-card text-center" style={{ gridColumn: '1 / -1', padding: '4rem 2rem' }}>
              <h3>לא נמצאו ספרים תואמים לחיפוש שלך</h3>
              <button className="btn btn-secondary mt-4" onClick={() => { setSearchQuery(''); setSelectedGenre(''); }}>נקה סינונים</button>
            </div>
          ) : (
            filteredBooks.map(book => {
              const isMine = currentUser && book.ownerId === currentUser.uid;
              return (
              <div key={book.id} className="glass-card flex flex-col hover-lift" style={{ 
                padding: '0', 
                overflow: 'hidden', 
                position: 'relative',
                border: isMine ? '2px solid var(--primary-color)' : '',
                boxShadow: isMine ? '0 8px 30px rgba(99, 102, 241, 0.2)' : ''
              }}>
                {isMine && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}>
                    הספר שלי
                  </div>
                )}
                <div style={{ height: '240px', width: '100%', overflow: 'hidden' }}>
                  <img src={book.coverImage} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="flex-col justify-between flex" style={{ padding: '1.5rem', flex: 1 }}>
                  <div>
                    <h4 style={{ marginBottom: '0.5rem' }}>{book.title}</h4>
                    <p className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>{book.author}</p>
                    <p style={{ fontSize: '1.1rem', color: 'var(--primary-color)', fontWeight: '600' }}>{book.genre}</p>
                  </div>
                  <div className="mt-4 pt-4 flex justify-between items-center" style={{ borderTop: '1px solid var(--surface-border)' }}>
                    <p style={{ fontSize: '1rem', color: isMine ? 'var(--primary-color)' : 'var(--text-muted)', fontWeight: isMine ? 'bold' : 'normal' }}>
                      שייך ל: <strong>{isMine ? 'אני' : book.ownerName}</strong>
                    </p>
                    {!isMine && book.ownerPhone && (
                      <a href={`https://api.whatsapp.com/send?phone=${book.ownerPhone.replace(/\D/g, '').replace(/^0/, '972')}&text=${encodeURIComponent(`היי ${book.ownerName}! 👋 ראיתי את הספר "${book.title}" בספריית ניר עוז וממש אשמח להשאיל אותו אם אפשר. תודה מראש! 📚✨`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', gap: '0.4rem', background: '#25D366', borderColor: '#25D366' }} title="שלח וואטסאפ">
                        <MessageCircle size={16} /> בקש
                      </a>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
